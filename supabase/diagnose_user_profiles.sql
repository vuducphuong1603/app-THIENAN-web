-- Diagnostic queries to check user_profiles table
-- Run these in Supabase SQL Editor to understand why no users are showing

-- ============================================================================
-- Step 1: Check if user_profiles table exists
-- ============================================================================
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
) as table_exists;

-- Expected: table_exists = true
-- If false, the table doesn't exist and needs to be created

-- ============================================================================
-- Step 2: Check the table structure
-- ============================================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Expected columns: id, email, phone, role, full_name, saint_name, status, created_at, updated_at

-- ============================================================================
-- Step 3: Count users in user_profiles
-- ============================================================================
SELECT COUNT(*) as user_profiles_count
FROM user_profiles;

-- Expected: 97 (matching the 97 users in auth.users from your screenshot)
-- If 0, the table is empty and needs data synced from auth.users

-- ============================================================================
-- Step 4: Count users in auth.users (for comparison)
-- ============================================================================
SELECT COUNT(*) as auth_users_count
FROM auth.users;

-- Expected: 97 (from your screenshot)

-- ============================================================================
-- Step 5: Sample 5 users from user_profiles
-- ============================================================================
SELECT
    id,
    email,
    phone,
    role,
    full_name,
    saint_name,
    status
FROM user_profiles
LIMIT 5;

-- Expected: Should show 5 users with their data
-- If empty result, the table has no data

-- ============================================================================
-- Step 6: Check RLS policies
-- ============================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- This shows all RLS policies on user_profiles table
-- Make sure there are policies that allow reading data

-- ============================================================================
-- Step 7: Test if current user can SELECT from user_profiles
-- ============================================================================
-- This will fail with permission error if RLS is blocking you
SELECT COUNT(*) as can_read_count
FROM user_profiles;

-- ============================================================================
-- SOLUTION: If user_profiles is empty, run this to sync from auth.users
-- ============================================================================
-- ONLY RUN THIS IF Step 3 shows user_profiles_count = 0

/*
INSERT INTO user_profiles (id, email, phone, role, full_name, saint_name, status, created_at, updated_at)
SELECT
    id,
    email,
    phone,
    'catechist'::user_role,  -- Default role
    COALESCE(raw_user_metadata->>'full_name', ''),
    raw_user_metadata->>'saint_name',
    'ACTIVE',
    created_at,
    updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- After running, check count again:
SELECT COUNT(*) FROM user_profiles;
*/

-- ============================================================================
-- Summary Report
-- ============================================================================
SELECT
    (SELECT COUNT(*) FROM auth.users) as total_auth_users,
    (SELECT COUNT(*) FROM user_profiles) as total_user_profiles,
    (SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
    )) as table_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles') as rls_policy_count;

-- Expected:
-- - total_auth_users: 97
-- - total_user_profiles: 97 (or 0 if not synced yet)
-- - table_exists: true
-- - rls_policy_count: 6 (the RLS policies from migration)
