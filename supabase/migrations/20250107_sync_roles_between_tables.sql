-- Migration: Sync roles between user_profiles and teachers tables
-- Purpose: Ensure role consistency across mobile and web apps
-- Date: 2025-01-07
-- Updated: Fixed to use actual database structure (user_profiles, phone-based linking)

-- ============================================================================
-- Part 1: Verify table structure
-- ============================================================================

-- The teachers table already has:
-- - role column (TEXT NULL)
-- - phone column (TEXT NOT NULL UNIQUE)
-- - updated_at column (TIMESTAMP)

-- The user_profiles table already has:
-- - role column (TEXT NOT NULL with check constraint)
-- - phone column (TEXT NULL)
-- - id column (UUID references auth.users)

-- ============================================================================
-- Part 2: Function to sync user_profiles role to teachers table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_user_profile_role_to_teachers()
RETURNS TRIGGER AS $$
BEGIN
    -- When a user_profiles role is updated, sync it to matching teachers records
    -- Link by phone number (the only common field between tables)

    -- Update teachers table where phone matches
    IF NEW.phone IS NOT NULL AND TRIM(NEW.phone) != '' THEN
        UPDATE teachers
        SET
            role = NEW.role,
            updated_at = NOW()
        WHERE phone = NEW.phone
          AND (role IS NULL OR role != NEW.role);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Part 3: Create trigger to automatically sync on user_profiles update
-- ============================================================================

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS sync_user_profile_role_to_teachers_trigger ON user_profiles;

-- Create trigger that fires AFTER user_profiles role update
CREATE TRIGGER sync_user_profile_role_to_teachers_trigger
    AFTER UPDATE OF role ON user_profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION public.sync_user_profile_role_to_teachers();

-- ============================================================================
-- Part 4: One-time sync of existing data
-- ============================================================================

-- Sync all existing user_profiles roles to teachers table via phone matching
DO $$
DECLARE
    sync_count INTEGER := 0;
BEGIN
    -- Update teachers table where phone matches user_profiles
    UPDATE teachers t
    SET
        role = up.role,
        updated_at = NOW()
    FROM user_profiles up
    WHERE t.phone = up.phone
      AND up.phone IS NOT NULL
      AND (t.role IS NULL OR t.role != up.role);

    GET DIAGNOSTICS sync_count = ROW_COUNT;

    RAISE NOTICE 'Role synchronization completed. % teacher records updated.', sync_count;
END $$;

-- ============================================================================
-- Part 5: Comments and documentation
-- ============================================================================

COMMENT ON FUNCTION public.sync_user_profile_role_to_teachers() IS
'Automatically syncs role changes from user_profiles table to teachers table via phone number matching. This ensures consistency across mobile and web apps.';

-- ============================================================================
-- Verification query (run this to check sync status)
-- ============================================================================

-- SELECT
--     up.id as user_id,
--     up.email,
--     up.phone,
--     up.role as user_profile_role,
--     t.id as teacher_id,
--     t.full_name as teacher_name,
--     t.role as teacher_role,
--     CASE
--         WHEN up.phone IS NULL THEN 'NO PHONE'
--         WHEN t.role IS NULL THEN 'NO TEACHER MATCH'
--         WHEN up.role = t.role THEN 'SYNCED ✓'
--         ELSE 'MISMATCH ✗'
--     END as sync_status
-- FROM user_profiles up
-- LEFT JOIN teachers t ON t.phone = up.phone
-- ORDER BY sync_status, up.email;
