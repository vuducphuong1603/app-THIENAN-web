-- Migration: Enforce class-scoped Row Level Security on students table
-- Purpose: Ensure users only access students from their assigned class in Supabase
-- Date: 2025-02-20

-- Ensure user_profiles has class_id column for class assignments
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS class_id text;

COMMENT ON COLUMN public.user_profiles.class_id IS
    'Foreign key reference to the classes table used for scoping catechist access.';

-- Enable Row Level Security on students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies with the same names to keep migration idempotent
DROP POLICY IF EXISTS "Admins can read all students" ON public.students;
DROP POLICY IF EXISTS "Users can read students in their class" ON public.students;

-- Admins (and other privileged roles) retain full visibility
CREATE POLICY "Admins can read all students"
    ON public.students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND up.role = 'admin'
              AND COALESCE(up.status, 'ACTIVE') = 'ACTIVE'
        )
    );

-- Regular users can only read students that belong to their assigned class
CREATE POLICY "Users can read students in their class"
    ON public.students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_profiles up
            WHERE up.id = auth.uid()
              AND COALESCE(up.status, 'ACTIVE') = 'ACTIVE'
              AND up.role <> 'admin'
              AND NULLIF(TRIM(up.class_id), '') IS NOT NULL
              AND TRIM(up.class_id) = TRIM(public.students.class_id)
        )
    );
