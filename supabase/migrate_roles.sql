-- users jadvalidagi rol cheklovini yangilash
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('sysadmin', 'admin', 'director', 'academic', 'teacher', 'student', 'tutor', 'monitor'));

COMMENT ON COLUMN public.users.role IS 'Foydalanuvchi roli: sysadmin | admin | director | academic | teacher | student | tutor | monitor';
