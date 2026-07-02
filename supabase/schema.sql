-- ============================================================================
-- DAVOMAD — Davomat Boshqaruv Tizimi (Attendance Management System)
-- File: schema.sql
-- Description: Full database schema — tables, constraints, indexes, types
-- ============================================================================

-- 0) Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- 1) ORGANIZATIONS — Tashkilotlar
-- Har bir o'quv markaz / tashkilot uchun asosiy jadval
-- ============================================================================
CREATE TABLE public.organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    phone       TEXT,
    address     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.organizations IS 'O''quv markazlar va tashkilotlar ro''yxati';
COMMENT ON COLUMN public.organizations.name IS 'Tashkilot nomi (masalan: "IT Academy")';


-- ============================================================================
-- 2) USERS — Foydalanuvchilar (admin, teacher, student)
-- auth.users bilan bog'langan — id = auth.users.id
-- ============================================================================
CREATE TABLE public.users (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    role            TEXT NOT NULL DEFAULT 'student',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Role 5 ta qiymat qabul qiladi
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'teacher', 'student', 'tutor', 'monitor'))
);

-- Tez qidirish uchun indekslar
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_users_role            ON public.users(role);
CREATE INDEX idx_users_email           ON public.users(email);

COMMENT ON TABLE  public.users IS 'Barcha foydalanuvchilar: adminlar, o''qituvchilar, talabalar';
COMMENT ON COLUMN public.users.id IS 'auth.users jadvalidan keladigan UUID';
COMMENT ON COLUMN public.users.role IS 'Foydalanuvchi roli: admin | teacher | student';


-- ============================================================================
-- 3) GROUPS — Guruhlar
-- Har bir guruhda bitta o'qituvchi (teacher_id UNIQUE)
-- ============================================================================
CREATE TABLE public.groups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    teacher_id      UUID REFERENCES public.users(id) ON DELETE SET NULL, -- optional/legacy
    tutor_id        UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Guruh rahbari (web)
    monitor_id      UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Sinf sardori (app)
    name            TEXT NOT NULL,
    course_name     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tashkilot ichida guruhlarni tez topish
CREATE INDEX idx_groups_organization_id ON public.groups(organization_id);

COMMENT ON TABLE  public.groups IS 'O''quv guruhlari — har bir guruhda bitta o''qituvchi';
COMMENT ON COLUMN public.groups.teacher_id IS 'Guruh o''qituvchisi (UNIQUE — 1 teacher = 1 group)';
COMMENT ON COLUMN public.groups.course_name IS 'Kurs nomi (masalan: "Python Backend", "Frontend React")';


-- ============================================================================
-- 4) SCHEDULES — Dars jadvali
-- Haftalik takrorlanuvchi dars vaqtlari (1=Dushanba ... 6=Shanba)
-- ============================================================================
CREATE TABLE public.schedules (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Hafta kuni 1 (Dushanba) dan 6 (Shanba) gacha
    CONSTRAINT schedules_day_check CHECK (day_of_week BETWEEN 1 AND 6),
    -- Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak
    CONSTRAINT schedules_time_check CHECK (start_time < end_time),
    -- Bitta guruhda bitta kunda faqat bitta dars
    CONSTRAINT schedules_group_day_unique UNIQUE (group_id, day_of_week)
);

CREATE INDEX idx_schedules_group_id ON public.schedules(group_id);

COMMENT ON TABLE  public.schedules IS 'Haftalik dars jadvali — har bir guruh uchun';
COMMENT ON COLUMN public.schedules.day_of_week IS '1=Dushanba, 2=Seshanba, 3=Chorshanba, 4=Payshanba, 5=Juma, 6=Shanba';


-- ============================================================================
-- 5) STUDENTS — Talabalar (guruhga biriktirilgan)
-- user_id UNIQUE — har bir talaba faqat bitta guruhda
-- ============================================================================
CREATE TABLE public.students (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id   UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status    TEXT NOT NULL DEFAULT 'active',

    -- Talaba holati
    CONSTRAINT students_status_check CHECK (status IN ('active', 'left', 'transferred'))
);

CREATE INDEX idx_students_group_id ON public.students(group_id);
CREATE INDEX idx_students_user_id  ON public.students(user_id);
CREATE INDEX idx_students_status   ON public.students(status);

COMMENT ON TABLE  public.students IS 'Guruhlarga biriktirilgan talabalar';
COMMENT ON COLUMN public.students.user_id IS 'users jadvalidagi talaba (UNIQUE — 1 student = 1 group)';
COMMENT ON COLUMN public.students.status IS 'Talaba holati: active | left | transferred';


-- ============================================================================
-- 6) LESSONS — Darslar
-- Har bir dars muayyan sana uchun guruh ichida yaratiladi
-- ============================================================================
CREATE TABLE public.lessons (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title       TEXT,
    lesson_date DATE NOT NULL,
    created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Bitta guruhda bitta sanada faqat bitta dars
    CONSTRAINT lessons_group_date_unique UNIQUE (group_id, lesson_date)
);

CREATE INDEX idx_lessons_group_id    ON public.lessons(group_id);
CREATE INDEX idx_lessons_lesson_date ON public.lessons(lesson_date);
CREATE INDEX idx_lessons_created_by  ON public.lessons(created_by);

COMMENT ON TABLE  public.lessons IS 'Darslar — har bir guruh uchun kunlik dars yozuvi';
COMMENT ON COLUMN public.lessons.lesson_date IS 'Dars sanasi (YYYY-MM-DD)';
COMMENT ON COLUMN public.lessons.created_by IS 'Darsni yaratgan foydalanuvchi (admin yoki teacher)';


-- ============================================================================
-- 7) ATTENDANCE — Davomat (yo'qlama)
-- Har bir darsda har bir talaba uchun bitta yozuv
-- ============================================================================
CREATE TABLE public.attendance (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id  UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'absent',
    marked_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Bitta darsda bitta talaba faqat bir marta qayd etiladi
    CONSTRAINT attendance_lesson_student_unique UNIQUE (lesson_id, student_id),
    -- Davomat holati
    CONSTRAINT attendance_status_check CHECK (status IN ('present', 'absent', 'late'))
);

CREATE INDEX idx_attendance_lesson_id  ON public.attendance(lesson_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_status     ON public.attendance(status);
CREATE INDEX idx_attendance_marked_by  ON public.attendance(marked_by);

COMMENT ON TABLE  public.attendance IS 'Davomat yozuvlari — har bir darsda har bir talaba uchun';
COMMENT ON COLUMN public.attendance.status IS 'Davomat holati: present | absent | late';
COMMENT ON COLUMN public.attendance.marked_by IS 'Davomatni belgilagan foydalanuvchi (teacher yoki admin)';


-- ============================================================================
-- 8) HELPER FUNCTION — get_my_organization_id()
-- RLS polisalarida foydalanish uchun — joriy foydalanuvchining tashkilot ID si
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT organization_id
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_organization_id() IS
    'Joriy foydalanuvchining tashkilot ID sini qaytaradi (RLS uchun)';


-- ============================================================================
-- 9) HELPER FUNCTION — get_my_role()
-- Joriy foydalanuvchining rolini qaytaradi
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_role() IS
    'Joriy foydalanuvchining rolini qaytaradi: admin | teacher | student';


-- ============================================================================
-- Done! Schema yaratildi ✅
-- Keyingi qadam: rls_policies.sql → seed.sql → functions/generate_lessons.sql
-- ============================================================================
