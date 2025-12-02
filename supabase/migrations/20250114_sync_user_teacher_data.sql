-- Migration: Sync user_profiles data with teachers table
-- Purpose: Ensure all users have corresponding teacher records with sector/class data
-- Date: 2025-01-14
-- Description: This migration creates/updates teacher records for all users and syncs sector/class information

-- ============================================================================
-- Part 1: Create/update teacher records for all users in user_profiles
-- ============================================================================

-- Insert or update teacher records for all users
INSERT INTO teachers (
    phone,
    full_name,
    first_name,
    last_name,
    saint_name,
    role,
    status,
    sector,
    class_code,
    class_name,
    birth_date,
    address,
    created_at,
    updated_at
)
SELECT
    up.phone,
    up.full_name,
    -- Extract first name (last word in Vietnamese naming)
    CASE
        WHEN up.full_name IS NOT NULL AND TRIM(up.full_name) != '' THEN
            SPLIT_PART(TRIM(up.full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(up.full_name), ' '), 1))
        ELSE NULL
    END as first_name,
    -- Extract last name (everything except last word)
    CASE
        WHEN up.full_name IS NOT NULL AND TRIM(up.full_name) != ''
             AND ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(up.full_name), ' '), 1) > 1 THEN
            LEFT(TRIM(up.full_name), LENGTH(TRIM(up.full_name)) - LENGTH(SPLIT_PART(TRIM(up.full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(up.full_name), ' '), 1))) - 1)
        ELSE NULL
    END as last_name,
    up.saint_name,
    up.role,
    'teaching' as status,
    -- Map sector to proper format for teachers table
    CASE
        WHEN up.sector = 'CHIÊN' THEN 'Chiên'
        WHEN up.sector = 'ẤU' THEN 'Ấu'
        WHEN up.sector = 'THIẾU' THEN 'Thiếu'
        WHEN up.sector = 'NGHĨA' THEN 'Nghĩa'
        ELSE NULL
    END as sector,
    up.class_id as class_code,  -- Map class_id to class_code
    -- Get class name from classes table
    c.name as class_name,
    up.date_of_birth,
    up.address,
    COALESCE(up.created_at, NOW()) as created_at,
    NOW() as updated_at
FROM user_profiles up
LEFT JOIN classes c ON c.id = up.class_id
WHERE up.phone IS NOT NULL AND TRIM(up.phone) != ''
ON CONFLICT (phone) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    saint_name = EXCLUDED.saint_name,
    role = EXCLUDED.role,
    sector = CASE
        WHEN EXCLUDED.sector IS NOT NULL THEN EXCLUDED.sector
        ELSE teachers.sector
    END,
    class_code = CASE
        WHEN EXCLUDED.class_code IS NOT NULL THEN EXCLUDED.class_code
        ELSE teachers.class_code
    END,
    class_name = CASE
        WHEN EXCLUDED.class_name IS NOT NULL THEN EXCLUDED.class_name
        ELSE teachers.class_name
    END,
    birth_date = CASE
        WHEN EXCLUDED.birth_date IS NOT NULL THEN EXCLUDED.birth_date
        ELSE teachers.birth_date
    END,
    address = CASE
        WHEN EXCLUDED.address IS NOT NULL THEN EXCLUDED.address
        ELSE teachers.address
    END,
    updated_at = NOW();

-- ============================================================================
-- Part 2: Update teachers table to fill missing sector from class information
-- ============================================================================

-- For teachers with class_code but missing sector, derive sector from class
UPDATE teachers t
SET
    sector = CASE
        WHEN c.sector = 'CHIÊN' THEN 'Chiên'
        WHEN c.sector = 'ẤU' THEN 'Ấu'
        WHEN c.sector = 'THIẾU' THEN 'Thiếu'
        WHEN c.sector = 'NGHĨA' THEN 'Nghĩa'
        ELSE t.sector
    END,
    class_name = COALESCE(t.class_name, c.name),
    updated_at = NOW()
FROM classes c
WHERE t.class_code = c.id
  AND t.class_code IS NOT NULL
  AND (t.sector IS NULL OR t.class_name IS NULL);

-- ============================================================================
-- Part 3: Create function to keep data synchronized
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_user_profile_to_teacher()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_class_name TEXT;
    v_sector_label TEXT;
BEGIN
    -- Skip if no phone number
    IF NEW.phone IS NULL OR TRIM(NEW.phone) = '' THEN
        RETURN NEW;
    END IF;

    -- Extract name parts
    IF NEW.full_name IS NOT NULL AND TRIM(NEW.full_name) != '' THEN
        v_first_name := SPLIT_PART(TRIM(NEW.full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(NEW.full_name), ' '), 1));
        IF ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(NEW.full_name), ' '), 1) > 1 THEN
            v_last_name := LEFT(TRIM(NEW.full_name), LENGTH(TRIM(NEW.full_name)) - LENGTH(v_first_name) - 1);
        END IF;
    END IF;

    -- Get class name if class_id is provided
    IF NEW.class_id IS NOT NULL THEN
        SELECT name INTO v_class_name FROM classes WHERE id = NEW.class_id;
    END IF;

    -- Map sector to proper format
    v_sector_label := CASE
        WHEN NEW.sector = 'CHIÊN' THEN 'Chiên'
        WHEN NEW.sector = 'ẤU' THEN 'Ấu'
        WHEN NEW.sector = 'THIẾU' THEN 'Thiếu'
        WHEN NEW.sector = 'NGHĨA' THEN 'Nghĩa'
        ELSE NULL
    END;

    -- Insert or update teacher record
    INSERT INTO teachers (
        phone,
        full_name,
        first_name,
        last_name,
        saint_name,
        role,
        status,
        sector,
        class_code,
        class_name,
        birth_date,
        address,
        created_at,
        updated_at
    ) VALUES (
        NEW.phone,
        NEW.full_name,
        v_first_name,
        v_last_name,
        NEW.saint_name,
        NEW.role,
        'teaching',
        v_sector_label,
        NEW.class_id,  -- Map class_id to class_code
        v_class_name,
        NEW.date_of_birth,
        NEW.address,
        COALESCE(NEW.created_at, NOW()),
        NOW()
    )
    ON CONFLICT (phone) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        saint_name = EXCLUDED.saint_name,
        role = EXCLUDED.role,
        sector = CASE
            WHEN EXCLUDED.sector IS NOT NULL THEN EXCLUDED.sector
            ELSE teachers.sector
        END,
        class_code = CASE
            WHEN EXCLUDED.class_code IS NOT NULL THEN EXCLUDED.class_code
            ELSE teachers.class_code
        END,
        class_name = CASE
            WHEN EXCLUDED.class_name IS NOT NULL THEN EXCLUDED.class_name
            ELSE teachers.class_name
        END,
        birth_date = CASE
            WHEN EXCLUDED.birth_date IS NOT NULL THEN EXCLUDED.birth_date
            ELSE teachers.birth_date
        END,
        address = CASE
            WHEN EXCLUDED.address IS NOT NULL THEN EXCLUDED.address
            ELSE teachers.address
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Part 4: Create triggers for automatic synchronization
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS sync_user_profile_to_teacher_on_insert ON user_profiles;
DROP TRIGGER IF EXISTS sync_user_profile_to_teacher_on_update ON user_profiles;

-- Create trigger for INSERT
CREATE TRIGGER sync_user_profile_to_teacher_on_insert
    AFTER INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_profile_to_teacher();

-- Create trigger for UPDATE
CREATE TRIGGER sync_user_profile_to_teacher_on_update
    AFTER UPDATE ON user_profiles
    FOR EACH ROW
    WHEN (
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.full_name IS DISTINCT FROM NEW.full_name OR
        OLD.saint_name IS DISTINCT FROM NEW.saint_name OR
        OLD.role IS DISTINCT FROM NEW.role OR
        OLD.sector IS DISTINCT FROM NEW.sector OR
        OLD.class_id IS DISTINCT FROM NEW.class_id OR
        OLD.date_of_birth IS DISTINCT FROM NEW.date_of_birth OR
        OLD.address IS DISTINCT FROM NEW.address
    )
    EXECUTE FUNCTION public.sync_user_profile_to_teacher();

-- ============================================================================
-- Part 5: Verification and logging
-- ============================================================================

DO $$
DECLARE
    v_user_count INTEGER;
    v_teacher_count INTEGER;
    v_synced_count INTEGER;
    v_sector_filled INTEGER;
    v_class_filled INTEGER;
BEGIN
    -- Count total users with phone numbers
    SELECT COUNT(*) INTO v_user_count
    FROM user_profiles
    WHERE phone IS NOT NULL AND TRIM(phone) != '';

    -- Count teachers
    SELECT COUNT(*) INTO v_teacher_count
    FROM teachers;

    -- Count synced records (matching phone)
    SELECT COUNT(*) INTO v_synced_count
    FROM user_profiles up
    JOIN teachers t ON t.phone = up.phone
    WHERE up.phone IS NOT NULL;

    -- Count teachers with sector filled
    SELECT COUNT(*) INTO v_sector_filled
    FROM teachers
    WHERE sector IS NOT NULL;

    -- Count teachers with class filled
    SELECT COUNT(*) INTO v_class_filled
    FROM teachers
    WHERE class_id IS NOT NULL OR class_name IS NOT NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Data Synchronization Summary:';
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Total users with phone: %', v_user_count;
    RAISE NOTICE 'Total teacher records: %', v_teacher_count;
    RAISE NOTICE 'Synced records: %', v_synced_count;
    RAISE NOTICE 'Teachers with sector: %', v_sector_filled;
    RAISE NOTICE 'Teachers with class: %', v_class_filled;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- Part 6: Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION public.sync_user_profile_to_teacher() IS
'Automatically syncs user_profiles data to teachers table, ensuring all users have corresponding teacher records with proper sector and class information';

-- ============================================================================
-- Verification queries (for testing)
-- ============================================================================

-- Check sync status
-- SELECT
--     up.id as user_id,
--     up.phone,
--     up.full_name as user_name,
--     up.sector as user_sector,
--     up.class_id as user_class_id,
--     t.id as teacher_id,
--     t.sector as teacher_sector,
--     t.class_code as teacher_class_code,
--     t.class_name as teacher_class_name,
--     CASE
--         WHEN t.phone IS NULL THEN 'NO TEACHER RECORD'
--         WHEN t.sector IS NULL AND up.sector IS NOT NULL THEN 'MISSING SECTOR'
--         WHEN t.class_code IS NULL AND up.class_id IS NOT NULL THEN 'MISSING CLASS'
--         ELSE 'SYNCED'
--     END as sync_status
-- FROM user_profiles up
-- LEFT JOIN teachers t ON t.phone = up.phone
-- WHERE up.phone IS NOT NULL
-- ORDER BY sync_status, up.full_name;