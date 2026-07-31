-- ADD degree COLUMN TO teachers TABLE
-- Ushbu skript teachers jadvaliga degree ustunini qo'shadi.
-- Uni Supabase SQL Editor-da ishga tushiring.

ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS degree TEXT;

COMMENT ON COLUMN public.teachers.degree IS 'O''qituvchining ilmiy darajasi (PhD, Academic, Professor va h.k.)';
