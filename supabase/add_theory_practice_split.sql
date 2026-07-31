-- 1. Update teacher_subjects table to support theory/practice split
ALTER TABLE public.teacher_subjects
ADD COLUMN IF NOT EXISTS allocated_theory_hours INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS allocated_practice_hours INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_theory_hours INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_practice_hours INTEGER NOT NULL DEFAULT 0;

-- 2. Add lesson_type column to lessons and schedules tables
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(20) NOT NULL DEFAULT 'practice';

ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(20) NOT NULL DEFAULT 'practice';

-- 3. Add constraint checks on lesson_type
ALTER TABLE public.lessons
DROP CONSTRAINT IF EXISTS check_lesson_type;

ALTER TABLE public.lessons
ADD CONSTRAINT check_lesson_type CHECK (lesson_type IN ('theory', 'practice'));

ALTER TABLE public.schedules
DROP CONSTRAINT IF EXISTS check_lesson_type;

ALTER TABLE public.schedules
ADD CONSTRAINT check_lesson_type CHECK (lesson_type IN ('theory', 'practice'));
