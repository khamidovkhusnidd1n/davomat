-- ============================================================================
-- DAVOMAD — TO'LIQ RESET (Oddiy login/parol versiya)
-- Supabase SQL Editor'da shu faylni to'liq run qiling
-- ============================================================================

-- 1) ESKI NARSALARNI TOZALASH
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP FUNCTION IF EXISTS public.get_my_organization_id();
DROP FUNCTION IF EXISTS public.get_my_role();

-- Auth tozalash
DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@app.local' OR email LIKE '%@itacademy.uz');
DELETE FROM auth.users WHERE email LIKE '%@app.local' OR email LIKE '%@itacademy.uz';

-- Ruxsatlar
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2) JADVALLAR
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'teacher', 'student', 'tutor', 'monitor'))
);
CREATE INDEX idx_users_org ON public.users(organization_id);
CREATE INDEX idx_users_role ON public.users(role);

CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tutor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    monitor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    course_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_groups_org ON public.groups(organization_id);

CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT schedules_day_check CHECK (day_of_week BETWEEN 1 AND 6),
    CONSTRAINT schedules_time_check CHECK (start_time < end_time),
    CONSTRAINT schedules_group_day_unique UNIQUE (group_id, day_of_week)
);

CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT students_status_check CHECK (status IN ('active', 'left', 'transferred'))
);

CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT,
    lesson_date DATE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT lessons_group_date_unique UNIQUE (group_id, lesson_date)
);

CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'absent',
    marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT attendance_lesson_student_unique UNIQUE (lesson_id, student_id),
    CONSTRAINT attendance_status_check CHECK (status IN ('present', 'absent', 'late'))
);

-- 3) HELPER FUNKSIYALAR
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 4) RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY "read_own_org" ON public.organizations FOR SELECT TO authenticated
    USING (id = public.get_my_organization_id());
CREATE POLICY "update_own_org" ON public.organizations FOR UPDATE TO authenticated
    USING (id = public.get_my_organization_id() AND public.get_my_role() = 'admin')
    WITH CHECK (id = public.get_my_organization_id() AND public.get_my_role() = 'admin');

-- Users
CREATE POLICY "read_org_users" ON public.users FOR SELECT TO authenticated
    USING (organization_id = public.get_my_organization_id());
CREATE POLICY "insert_users" ON public.users FOR INSERT TO authenticated
    WITH CHECK (organization_id = public.get_my_organization_id() AND public.get_my_role() = 'admin');
CREATE POLICY "update_users" ON public.users FOR UPDATE TO authenticated
    USING (organization_id = public.get_my_organization_id() AND public.get_my_role() = 'admin')
    WITH CHECK (organization_id = public.get_my_organization_id() AND public.get_my_role() = 'admin');
CREATE POLICY "delete_users" ON public.users FOR DELETE TO authenticated
    USING (organization_id = public.get_my_organization_id() AND public.get_my_role() = 'admin');

-- Groups
CREATE POLICY "read_groups" ON public.groups FOR SELECT TO authenticated
    USING (organization_id = public.get_my_organization_id());
CREATE POLICY "insert_groups" ON public.groups FOR INSERT TO authenticated
    WITH CHECK (organization_id = public.get_my_organization_id() AND public.get_my_role() = 'admin');
CREATE POLICY "update_groups" ON public.groups FOR UPDATE TO authenticated
    USING (organization_id = public.get_my_organization_id() AND public.get_my_role() = 'admin')
    WITH CHECK (organization_id = public.get_my_organization_id() AND public.get_my_role() = 'admin');
CREATE POLICY "delete_groups" ON public.groups FOR DELETE TO authenticated
    USING (organization_id = public.get_my_organization_id() AND public.get_my_role() = 'admin');

-- Schedules
CREATE POLICY "read_schedules" ON public.schedules FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "insert_schedules" ON public.schedules FOR INSERT TO authenticated
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "update_schedules" ON public.schedules FOR UPDATE TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id AND g.organization_id = public.get_my_organization_id()))
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "delete_schedules" ON public.schedules FOR DELETE TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id AND g.organization_id = public.get_my_organization_id()));

-- Students
CREATE POLICY "read_students" ON public.students FOR SELECT TO authenticated
    USING (CASE
        WHEN public.get_my_role() = 'admin' THEN EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.organization_id = public.get_my_organization_id())
        WHEN public.get_my_role() IN ('teacher','tutor','monitor') THEN EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()))
        ELSE false END);
CREATE POLICY "insert_students" ON public.students FOR INSERT TO authenticated
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "update_students" ON public.students FOR UPDATE TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.organization_id = public.get_my_organization_id()))
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "delete_students" ON public.students FOR DELETE TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.organization_id = public.get_my_organization_id()));

-- Lessons
CREATE POLICY "read_lessons" ON public.lessons FOR SELECT TO authenticated
    USING (CASE
        WHEN public.get_my_role() = 'admin' THEN EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id AND g.organization_id = public.get_my_organization_id())
        WHEN public.get_my_role() IN ('teacher','tutor','monitor') THEN EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()))
        ELSE false END);
CREATE POLICY "insert_lessons" ON public.lessons FOR INSERT TO authenticated
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "update_lessons" ON public.lessons FOR UPDATE TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id AND g.organization_id = public.get_my_organization_id()))
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "delete_lessons" ON public.lessons FOR DELETE TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id AND g.organization_id = public.get_my_organization_id()));

-- Attendance
CREATE POLICY "read_attendance" ON public.attendance FOR SELECT TO authenticated
    USING (CASE
        WHEN public.get_my_role() = 'admin' THEN EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id())
        WHEN public.get_my_role() IN ('teacher','tutor','monitor') THEN EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()))
        ELSE false END);
CREATE POLICY "admin_insert_attendance" ON public.attendance FOR INSERT TO authenticated
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "teacher_insert_attendance" ON public.attendance FOR INSERT TO authenticated
    WITH CHECK (public.get_my_role() IN ('teacher','tutor','monitor') AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()) AND l.lesson_date = CURRENT_DATE));
CREATE POLICY "admin_update_attendance" ON public.attendance FOR UPDATE TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id()))
    WITH CHECK (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id()));
CREATE POLICY "teacher_update_attendance" ON public.attendance FOR UPDATE TO authenticated
    USING (public.get_my_role() IN ('teacher','tutor','monitor') AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()) AND l.lesson_date >= CURRENT_DATE - INTERVAL '1 day'))
    WITH CHECK (public.get_my_role() IN ('teacher','tutor','monitor') AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()) AND l.lesson_date >= CURRENT_DATE - INTERVAL '1 day'));
CREATE POLICY "delete_attendance" ON public.attendance FOR DELETE TO authenticated
    USING (public.get_my_role() = 'admin' AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id()));

-- 5) RUXSATLAR
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- 6) TASHKILOT (admin qo'shishdan OLDIN)
INSERT INTO public.organizations (id, name, phone, address) VALUES
    ('11111111-1111-1111-1111-111111111111', 'O''zBA huzuridagi markaz', '+998 71 200 00 01', 'Toshkent sh.');

-- ============================================================================
-- TAYYOR! Endi 2-qadamga o'ting:
-- Supabase Dashboard → Authentication → Users → Add User:
--   Email: admin@app.local
--   Password: [Xavfsizlik uchun olib tashlandi]
--   Auto Confirm: ✅
-- Keyin 3-qadamdagi SQL ni run qiling (admin_setup.sql)
-- ============================================================================
