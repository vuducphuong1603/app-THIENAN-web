-- Migration: Rename class_code to class_id in teachers table
-- Purpose: Rename the class_code column to class_id for better clarity as it stores class IDs
-- Date: 2025-01-15
-- Description: This migration renames the class_code column to class_id in the teachers table
--              and updates all related functions and triggers

-- ============================================================================
-- Part 1: Rename the column in teachers table
-- ============================================================================

-- Rename the column from class_code to class_id
ALTER TABLE teachers
RENAME COLUMN class_code TO class_id;

-- ============================================================================
-- Part 2: Update the sync function to use class_id instead of class_code
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
        class_id,  -- Changed from class_code to class_id
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
        NEW.class_id,  -- Use class_id directly
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
        class_id = CASE  -- Changed from class_code to class_id
            WHEN EXCLUDED.class_id IS NOT NULL THEN EXCLUDED.class_id
            ELSE teachers.class_id
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
-- Part 3: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN teachers.class_id IS 'Foreign key reference to the classes table (renamed from class_code for clarity)';

-- ============================================================================
-- Part 4: Verification queries (for testing)
-- ============================================================================

-- Check that the column has been renamed
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'teachers'
-- AND column_name IN ('class_code', 'class_id');

-- Verify the sync is still working
-- SELECT
--     t.id,
--     t.phone,
--     t.full_name,
--     t.class_id,
--     t.class_name,
--     c.id as class_table_id,
--     c.name as class_table_name
-- FROM teachers t
-- LEFT JOIN classes c ON c.id = t.class_id
-- LIMIT 10;