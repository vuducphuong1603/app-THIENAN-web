-- Migration: Add missing columns to existing user_profiles table
-- Purpose: Update user_profiles table to match web app expectations
-- Date: 2025-10-09
-- SAFE: Only adds columns, does not modify existing data

-- ============================================================================
-- Part 1: Add missing columns (if they don't exist)
-- ============================================================================

-- Add email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column';
    ELSE
        RAISE NOTICE 'Email column already exists';
    END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column';
    ELSE
        RAISE NOTICE 'Phone column already exists';
    END IF;
END $$;

-- Add saint_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'saint_name'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN saint_name TEXT;
        RAISE NOTICE 'Added saint_name column';
    ELSE
        RAISE NOTICE 'Saint_name column already exists';
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN status TEXT DEFAULT 'ACTIVE';
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'Status column already exists';
    END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    ELSE
        RAISE NOTICE 'Created_at column already exists';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'Updated_at column already exists';
    END IF;
END $$;

-- ============================================================================
-- Part 2: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ============================================================================
-- Part 3: Sync email and phone from auth.users (if columns were just added)
-- ============================================================================

DO $$
DECLARE
    synced_count INTEGER := 0;
BEGIN
    -- Update email and phone from auth.users where they are null
    UPDATE user_profiles up
    SET
        email = COALESCE(up.email, au.email),
        phone = COALESCE(up.phone, au.phone),
        saint_name = COALESCE(up.saint_name, au.raw_user_meta_data->>'saint_name'),
        status = COALESCE(up.status, 'ACTIVE'),
        created_at = COALESCE(up.created_at, au.created_at),
        updated_at = COALESCE(up.updated_at, au.updated_at)
    FROM auth.users au
    WHERE up.id = au.id
    AND (
        up.email IS NULL OR
        up.phone IS NULL OR
        up.saint_name IS NULL OR
        up.status IS NULL OR
        up.created_at IS NULL OR
        up.updated_at IS NULL
    );

    GET DIAGNOSTICS synced_count = ROW_COUNT;
    RAISE NOTICE 'Synced % user records from auth.users', synced_count;
END $$;

-- ============================================================================
-- Part 4: Verification
-- ============================================================================

-- Show summary
SELECT
    COUNT(*) as total_users,
    COUNT(email) as users_with_email,
    COUNT(phone) as users_with_phone,
    COUNT(saint_name) as users_with_saint_name,
    COUNT(status) as users_with_status
FROM user_profiles;

-- Expected: All counts should be equal (97)

COMMENT ON COLUMN user_profiles.email IS 'User email address from auth.users';
COMMENT ON COLUMN user_profiles.phone IS 'Phone number used for linking to teachers table';
COMMENT ON COLUMN user_profiles.saint_name IS 'Catholic saint name (Tên thánh)';
COMMENT ON COLUMN user_profiles.status IS 'Account status: ACTIVE or INACTIVE';
