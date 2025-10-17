-- Add notes column to students table for cross-application annotations
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.students.notes IS 'Free-form notes shared between all applications.';
