-- One-time script to sync user_profiles and teachers data
-- This script can be run manually in Supabase SQL Editor to ensure data consistency
-- Date: 2025-01-14

-- ============================================================================
-- Step 1: Check current data status
-- ============================================================================

DO $$
DECLARE
    v_user_count INTEGER;
    v_teacher_count INTEGER;
    v_missing_teacher INTEGER;
    v_missing_sector INTEGER;
    v_missing_class INTEGER;
BEGIN
    -- Count total users with phone
    SELECT COUNT(*) INTO v_user_count
    FROM user_profiles
    WHERE phone IS NOT NULL AND TRIM(phone) != '';

    -- Count teachers
    SELECT COUNT(*) INTO v_teacher_count
    FROM teachers;

    -- Count users without matching teacher record
    SELECT COUNT(*) INTO v_missing_teacher
    FROM user_profiles up
    WHERE up.phone IS NOT NULL AND TRIM(up.phone) != ''
      AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.phone = up.phone);

    -- Count teachers without sector
    SELECT COUNT(*) INTO v_missing_sector
    FROM teachers
    WHERE sector IS NULL OR TRIM(sector) = '';

    -- Count teachers without class
    SELECT COUNT(*) INTO v_missing_class
    FROM teachers
    WHERE class_code IS NULL AND class_name IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'BEFORE SYNC - Data Status:';
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Total users with phone: %', v_user_count;
    RAISE NOTICE 'Total teacher records: %', v_teacher_count;
    RAISE NOTICE 'Users without teacher record: %', v_missing_teacher;
    RAISE NOTICE 'Teachers without sector: %', v_missing_sector;
    RAISE NOTICE 'Teachers without class: %', v_missing_class;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- Step 2: Create teacher records for all users
-- ============================================================================

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
    -- Map sector to proper format
    CASE
        WHEN up.sector = 'CHIÊN' THEN 'Chiên'
        WHEN up.sector = 'ẤU' THEN 'Ấu'
        WHEN up.sector = 'THIẾU' THEN 'Thiếu'
        WHEN up.sector = 'NGHĨA' THEN 'Nghĩa'
        ELSE NULL
    END as sector,
    up.class_id as class_code,  -- Use class_id as class_code
    c.name as class_name,
    up.date_of_birth,
    up.address,
    COALESCE(up.created_at, NOW()) as created_at,
    NOW() as updated_at
FROM user_profiles up
LEFT JOIN classes c ON c.id = up.class_id
WHERE up.phone IS NOT NULL AND TRIM(up.phone) != ''
ON CONFLICT (phone) DO NOTHING;

-- ============================================================================
-- Step 3: Update existing teacher records with user_profiles data
-- ============================================================================

UPDATE teachers t
SET
    full_name = COALESCE(up.full_name, t.full_name),
    first_name = CASE
        WHEN up.full_name IS NOT NULL AND TRIM(up.full_name) != '' THEN
            SPLIT_PART(TRIM(up.full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(up.full_name), ' '), 1))
        ELSE t.first_name
    END,
    last_name = CASE
        WHEN up.full_name IS NOT NULL AND TRIM(up.full_name) != ''
             AND ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(up.full_name), ' '), 1) > 1 THEN
            LEFT(TRIM(up.full_name), LENGTH(TRIM(up.full_name)) - LENGTH(SPLIT_PART(TRIM(up.full_name), ' ', ARRAY_LENGTH(STRING_TO_ARRAY(TRIM(up.full_name), ' '), 1))) - 1)
        ELSE t.last_name
    END,
    saint_name = COALESCE(up.saint_name, t.saint_name),
    role = COALESCE(up.role, t.role),
    sector = CASE
        WHEN up.sector IS NOT NULL THEN
            CASE
                WHEN up.sector = 'CHIÊN' THEN 'Chiên'
                WHEN up.sector = 'ẤU' THEN 'Ấu'
                WHEN up.sector = 'THIẾU' THEN 'Thiếu'
                WHEN up.sector = 'NGHĨA' THEN 'Nghĩa'
                ELSE t.sector
            END
        ELSE t.sector
    END,
    class_code = COALESCE(up.class_id, t.class_code),  -- Map class_id to class_code
    birth_date = COALESCE(up.date_of_birth, t.birth_date),
    address = COALESCE(up.address, t.address),
    updated_at = NOW()
FROM user_profiles up
WHERE t.phone = up.phone
  AND up.phone IS NOT NULL;

-- ============================================================================
-- Step 4: Update class_name for all teachers with class_code
-- ============================================================================

UPDATE teachers t
SET
    class_name = c.name,
    updated_at = NOW()
FROM classes c
WHERE t.class_code = c.id
  AND t.class_code IS NOT NULL
  AND (t.class_name IS NULL OR t.class_name != c.name);

-- ============================================================================
-- Step 5: Derive sector from class for teachers without sector
-- ============================================================================

UPDATE teachers t
SET
    sector = CASE
        WHEN c.sector = 'CHIÊN' THEN 'Chiên'
        WHEN c.sector = 'ẤU' THEN 'Ấu'
        WHEN c.sector = 'THIẾU' THEN 'Thiếu'
        WHEN c.sector = 'NGHĨA' THEN 'Nghĩa'
        ELSE t.sector
    END,
    updated_at = NOW()
FROM classes c
WHERE t.class_code = c.id
  AND t.class_code IS NOT NULL
  AND t.sector IS NULL;

-- ============================================================================
-- Step 6: Sync back to user_profiles where missing
-- ============================================================================

-- Update user_profiles with sector from teachers where user has no sector
UPDATE user_profiles up
SET
    sector = CASE
        WHEN t.sector = 'Chiên' THEN 'CHIÊN'
        WHEN t.sector = 'Ấu' THEN 'ẤU'
        WHEN t.sector = 'Thiếu' THEN 'THIẾU'
        WHEN t.sector = 'Nghĩa' THEN 'NGHĨA'
        ELSE up.sector
    END,
    updated_at = NOW()
FROM teachers t
WHERE up.phone = t.phone
  AND up.sector IS NULL
  AND t.sector IS NOT NULL;

-- Update user_profiles with class_id from teachers where user has no class_id
UPDATE user_profiles up
SET
    class_id = t.class_code,  -- Map class_code back to class_id
    updated_at = NOW()
FROM teachers t
WHERE up.phone = t.phone
  AND up.class_id IS NULL
  AND t.class_code IS NOT NULL;

-- ============================================================================
-- Step 7: Final verification
-- ============================================================================

DO $$
DECLARE
    v_user_count INTEGER;
    v_teacher_count INTEGER;
    v_synced_count INTEGER;
    v_sector_filled INTEGER;
    v_class_filled INTEGER;
    v_both_filled INTEGER;
BEGIN
    -- Count total users with phone
    SELECT COUNT(*) INTO v_user_count
    FROM user_profiles
    WHERE phone IS NOT NULL AND TRIM(phone) != '';

    -- Count teachers
    SELECT COUNT(*) INTO v_teacher_count
    FROM teachers;

    -- Count synced records
    SELECT COUNT(*) INTO v_synced_count
    FROM user_profiles up
    JOIN teachers t ON t.phone = up.phone
    WHERE up.phone IS NOT NULL;

    -- Count teachers with sector
    SELECT COUNT(*) INTO v_sector_filled
    FROM teachers
    WHERE sector IS NOT NULL AND TRIM(sector) != '';

    -- Count teachers with class
    SELECT COUNT(*) INTO v_class_filled
    FROM teachers
    WHERE class_code IS NOT NULL OR (class_name IS NOT NULL AND TRIM(class_name) != '');

    -- Count teachers with both sector and class
    SELECT COUNT(*) INTO v_both_filled
    FROM teachers
    WHERE sector IS NOT NULL AND TRIM(sector) != ''
      AND (class_code IS NOT NULL OR (class_name IS NOT NULL AND TRIM(class_name) != ''));

    RAISE NOTICE '========================================';
    RAISE NOTICE 'AFTER SYNC - Final Status:';
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Total users with phone: %', v_user_count;
    RAISE NOTICE 'Total teacher records: %', v_teacher_count;
    RAISE NOTICE 'Synced records: %', v_synced_count;
    RAISE NOTICE 'Teachers with sector: %', v_sector_filled;
    RAISE NOTICE 'Teachers with class: %', v_class_filled;
    RAISE NOTICE 'Teachers with both: %', v_both_filled;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Sync completed successfully!';
    RAISE NOTICE 'You can now check the user management page.';
END $$;

-- ============================================================================
-- Step 8: List users that still need attention
-- ============================================================================

SELECT
    'Users without sector or class' as issue_type,
    up.id,
    up.phone,
    up.full_name,
    up.role,
    t.sector as teacher_sector,
    t.class_name as teacher_class
FROM user_profiles up
LEFT JOIN teachers t ON t.phone = up.phone
WHERE up.phone IS NOT NULL
  AND (t.sector IS NULL OR t.class_code IS NULL)
ORDER BY up.full_name
LIMIT 20;