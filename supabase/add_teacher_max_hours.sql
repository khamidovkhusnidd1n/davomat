-- ADD max_hours COLUMN TO teachers TABLE
-- Ushbu skript teachers jadvaliga max_hours ustunini qo'shadi.
-- Uni Supabase SQL Editor-da ishga tushiring.

ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS max_hours INTEGER NOT NULL DEFAULT 120;

COMMENT ON COLUMN public.teachers.max_hours IS 'O''qituvchining yillik dars berish soati limiti';
