-- ADD completed_hours COLUMN TO teacher_subjects TABLE
-- Ushbu skript teacher_subjects jadvaliga completed_hours ustunini qo'shadi.
-- Uni Supabase SQL Editor-da ishga tushiring.

ALTER TABLE public.teacher_subjects
ADD COLUMN IF NOT EXISTS completed_hours INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.teacher_subjects.completed_hours IS 'O''qituvchi tomonidan shu fan bo''yicha o''tilgan soatlar (tizimdan tashqari/qo''lda kiritilgan)';
