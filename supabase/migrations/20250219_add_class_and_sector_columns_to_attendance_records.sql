-- Migration: Add class and sector metadata columns to attendance_records
-- Description: Stores denormalized class and sector information directly on attendance records
--              to support cross-application analytics without additional joins.
-- Date: 2025-02-19

-- ============================================================================
-- Step 1: Add new metadata columns (idempotent in case of re-run)
-- ============================================================================

ALTER TABLE public.attendance_records
    ADD COLUMN IF NOT EXISTS student_class_id text,
    ADD COLUMN IF NOT EXISTS student_class_name text,
    ADD COLUMN IF NOT EXISTS student_sector_id integer,
    ADD COLUMN IF NOT EXISTS student_sector_code text,
    ADD COLUMN IF NOT EXISTS student_sector_name text;

COMMENT ON COLUMN public.attendance_records.student_class_id IS 'Snapshot of the class_id the student belonged to when the record was created';
COMMENT ON COLUMN public.attendance_records.student_class_name IS 'Snapshot of the class name the student belonged to when the record was created';
COMMENT ON COLUMN public.attendance_records.student_sector_id IS 'Snapshot of the sector_id the student''s class referenced when the record was created';
COMMENT ON COLUMN public.attendance_records.student_sector_code IS 'Snapshot of the sector code (e.g. CHIEN, AU, THIEU, NGHIA) when the record was created';
COMMENT ON COLUMN public.attendance_records.student_sector_name IS 'Snapshot of the sector display name when the record was created';

-- ============================================================================
-- Step 2: Backfill existing attendance records with current student metadata
-- ============================================================================

UPDATE public.attendance_records AS ar
SET
    student_class_id = COALESCE(ar.student_class_id, s.class_id),
    student_class_name = COALESCE(ar.student_class_name, NULLIF(TRIM(c.name), ''), NULLIF(TRIM(s.class_id), '')),
    student_sector_id = COALESCE(ar.student_sector_id, c.sector_id),
    student_sector_code = COALESCE(ar.student_sector_code, NULLIF(TRIM(sec.code), ''), NULLIF(TRIM(sec.name), '')),
    student_sector_name = COALESCE(ar.student_sector_name, NULLIF(TRIM(sec.name), ''), NULLIF(TRIM(sec.code), ''))
FROM public.students AS s
LEFT JOIN public.classes AS c ON c.id = s.class_id
LEFT JOIN public.sectors AS sec ON sec.id = c.sector_id
WHERE ar.student_id = s.id;

-- ============================================================================
-- Step 3: Helper function to derive class/sector metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION public.attendance_records_enrich_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_class_id text;
    v_class_name text;
    v_sector_id integer;
    v_sector_code text;
    v_sector_name text;
BEGIN
    IF NEW.student_id IS NULL THEN
        NEW.student_class_id := NULL;
        NEW.student_class_name := NULL;
        NEW.student_sector_id := NULL;
        NEW.student_sector_code := NULL;
        NEW.student_sector_name := NULL;
        RETURN NEW;
    END IF;

    SELECT
        s.class_id,
        COALESCE(NULLIF(TRIM(c.name), ''), NULLIF(TRIM(s.class_id), '')),
        c.sector_id,
        NULLIF(TRIM(sec.code), ''),
        NULLIF(TRIM(sec.name), '')
    INTO
        v_class_id,
        v_class_name,
        v_sector_id,
        v_sector_code,
        v_sector_name
    FROM public.students AS s
    LEFT JOIN public.classes AS c ON c.id = s.class_id
    LEFT JOIN public.sectors AS sec ON sec.id = c.sector_id
    WHERE s.id = NEW.student_id;

    NEW.student_class_id := v_class_id;
    NEW.student_class_name := v_class_name;
    NEW.student_sector_id := v_sector_id;
    NEW.student_sector_code := v_sector_code;
    NEW.student_sector_name := v_sector_name;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- Step 4: Trigger to populate metadata on insert/update
-- ============================================================================

DROP TRIGGER IF EXISTS trg_attendance_records_enrich_metadata ON public.attendance_records;

CREATE TRIGGER trg_attendance_records_enrich_metadata
BEFORE INSERT OR UPDATE OF student_id
ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.attendance_records_enrich_metadata();

-- ============================================================================
-- Step 5: Keep metadata in sync when a student's class changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_attendance_records_metadata_from_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_class_id text;
    v_class_name text;
    v_sector_id integer;
    v_sector_code text;
    v_sector_name text;
BEGIN
    SELECT
        s.class_id,
        COALESCE(NULLIF(TRIM(c.name), ''), NULLIF(TRIM(s.class_id), '')),
        c.sector_id,
        NULLIF(TRIM(sec.code), ''),
        NULLIF(TRIM(sec.name), '')
    INTO
        v_class_id,
        v_class_name,
        v_sector_id,
        v_sector_code,
        v_sector_name
    FROM public.students AS s
    LEFT JOIN public.classes AS c ON c.id = s.class_id
    LEFT JOIN public.sectors AS sec ON sec.id = c.sector_id
    WHERE s.id = NEW.id;

    UPDATE public.attendance_records AS ar
    SET
        student_class_id = v_class_id,
        student_class_name = v_class_name,
        student_sector_id = v_sector_id,
        student_sector_code = v_sector_code,
        student_sector_name = v_sector_name
    WHERE ar.student_id = NEW.id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_attendance_records_metadata ON public.students;

CREATE TRIGGER trg_refresh_attendance_records_metadata
AFTER UPDATE OF class_id
ON public.students
FOR EACH ROW
WHEN (OLD.class_id IS DISTINCT FROM NEW.class_id)
EXECUTE FUNCTION public.refresh_attendance_records_metadata_from_student();
