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
    user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id  UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status    TEXT NOT NULL DEFAULT 'active',

    -- Talaba holati
    CONSTRAINT students_status_check CHECK (status IN ('active', 'left', 'transferred')),
    -- Bitta talaba bitta guruhga faqat bir marta qo'shilishi mumkin
    CONSTRAINT students_user_group_unique UNIQUE (user_id, group_id)
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
    late_hours INTEGER DEFAULT 0,
    marked_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Bitta darsda bitta talaba faqat bir marta qayd etiladi
    CONSTRAINT attendance_lesson_student_unique UNIQUE (lesson_id, student_id),
    -- Davomat holati
    CONSTRAINT attendance_status_check CHECK (status IN ('present', 'absent', 'late')),
    CONSTRAINT attendance_late_hours_check CHECK (late_hours >= 0 AND late_hours <= 6)
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

-- ============================================================================
-- DAVOMAD — Davomat Boshqaruv Tizimi (Attendance Management System)
-- File: rls_policies.sql
-- Description: Row Level Security policies for admin and teacher roles
-- ============================================================================
-- Rollar:
--   admin   → O'z tashkiloti ichida to'liq CRUD
--   teacher → O'z guruhini o'qish, davomat belgilash (shu kun + 24 soat ichida tahrirlash)
--   student → MVP da login qilmaydi
-- ============================================================================


-- ============================================================================
-- 1) ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance     ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2) ORGANIZATIONS — Tashkilotlar
-- ============================================================================

-- Admin: o'z tashkilotini o'qish
CREATE POLICY "admin_read_own_org"
    ON public.organizations FOR SELECT
    TO authenticated
    USING (
        id = public.get_my_organization_id()
    );

-- Admin: o'z tashkilotini yangilash
CREATE POLICY "admin_update_own_org"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (
        id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    );


-- ============================================================================
-- 3) USERS — Foydalanuvchilar
-- ============================================================================

-- Admin: o'z tashkiloti foydalanuvchilarini o'qish
CREATE POLICY "admin_read_org_users"
    ON public.users FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
    );

-- Admin: yangi foydalanuvchi qo'shish (faqat o'z tashkilotiga)
CREATE POLICY "admin_insert_users"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    );

-- Admin: foydalanuvchi ma'lumotlarini yangilash
CREATE POLICY "admin_update_users"
    ON public.users FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    );

-- Admin: foydalanuvchini o'chirish
CREATE POLICY "admin_delete_users"
    ON public.users FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    );


-- ============================================================================
-- 4) GROUPS — Guruhlar
-- ============================================================================

-- Admin + Teacher: o'z tashkiloti guruhlarini o'qish
CREATE POLICY "org_read_groups"
    ON public.groups FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
    );

-- Admin: guruh yaratish
CREATE POLICY "admin_insert_groups"
    ON public.groups FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    );

-- Admin: guruhni yangilash
CREATE POLICY "admin_update_groups"
    ON public.groups FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    )
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    );

-- Admin: guruhni o'chirish
CREATE POLICY "admin_delete_groups"
    ON public.groups FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND public.get_my_role() = 'admin'
    );


-- ============================================================================
-- 5) SCHEDULES — Dars jadvali
-- ============================================================================

-- Admin + Teacher: o'z tashkiloti jadvallarini o'qish
CREATE POLICY "org_read_schedules"
    ON public.schedules FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = schedules.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Admin: jadval yaratish
CREATE POLICY "admin_insert_schedules"
    ON public.schedules FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = schedules.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Admin: jadvalni yangilash
CREATE POLICY "admin_update_schedules"
    ON public.schedules FOR UPDATE
    TO authenticated
    USING (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = schedules.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    )
    WITH CHECK (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = schedules.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Admin: jadvalni o'chirish
CREATE POLICY "admin_delete_schedules"
    ON public.schedules FOR DELETE
    TO authenticated
    USING (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = schedules.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );


-- ============================================================================
-- 6) STUDENTS — Talabalar
-- ============================================================================

-- Admin + Teacher: o'z tashkiloti talabalarini o'qish
-- Teacher faqat o'z guruhidagi talabalarni ko'radi
CREATE POLICY "read_students"
    ON public.students FOR SELECT
    TO authenticated
    USING (
        CASE
            WHEN public.get_my_role() = 'admin' THEN
                EXISTS (
                    SELECT 1 FROM public.groups g
                    WHERE g.id = students.group_id
                      AND g.organization_id = public.get_my_organization_id()
                )
            WHEN public.get_my_role() IN ('teacher', 'tutor', 'monitor') THEN
                EXISTS (
                    SELECT 1 FROM public.groups g
                    WHERE g.id = students.group_id
                      AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())
                )
            ELSE false
        END
    );

-- Admin: talaba qo'shish
CREATE POLICY "admin_insert_students"
    ON public.students FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = students.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Admin: talaba ma'lumotlarini yangilash
CREATE POLICY "admin_update_students"
    ON public.students FOR UPDATE
    TO authenticated
    USING (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = students.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    )
    WITH CHECK (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = students.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Admin: talabani o'chirish
CREATE POLICY "admin_delete_students"
    ON public.students FOR DELETE
    TO authenticated
    USING (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = students.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );


-- ============================================================================
-- 7) LESSONS — Darslar
-- ============================================================================

-- Admin: barcha tashkilot darslarini o'qish
-- Teacher: faqat o'z guruhining darslarini o'qish
CREATE POLICY "read_lessons"
    ON public.lessons FOR SELECT
    TO authenticated
    USING (
        CASE
            WHEN public.get_my_role() = 'admin' THEN
                EXISTS (
                    SELECT 1 FROM public.groups g
                    WHERE g.id = lessons.group_id
                      AND g.organization_id = public.get_my_organization_id()
                )
            WHEN public.get_my_role() IN ('teacher', 'tutor', 'monitor') THEN
                EXISTS (
                    SELECT 1 FROM public.groups g
                    WHERE g.id = lessons.group_id
                      AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())
                )
            ELSE false
        END
    );

-- Admin: dars yaratish
CREATE POLICY "admin_insert_lessons"
    ON public.lessons FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = lessons.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Admin: darsni yangilash
CREATE POLICY "admin_update_lessons"
    ON public.lessons FOR UPDATE
    TO authenticated
    USING (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = lessons.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    )
    WITH CHECK (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = lessons.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Admin: darsni o'chirish
CREATE POLICY "admin_delete_lessons"
    ON public.lessons FOR DELETE
    TO authenticated
    USING (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = lessons.group_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );


-- ============================================================================
-- 8) ATTENDANCE — Davomat
-- ============================================================================

-- Admin: barcha tashkilot davomatini o'qish
-- Teacher: faqat o'z guruhining davomatini o'qish
CREATE POLICY "read_attendance"
    ON public.attendance FOR SELECT
    TO authenticated
    USING (
        CASE
            WHEN public.get_my_role() = 'admin' THEN
                EXISTS (
                    SELECT 1 FROM public.lessons l
                    JOIN public.groups g ON g.id = l.group_id
                    WHERE l.id = attendance.lesson_id
                      AND g.organization_id = public.get_my_organization_id()
                )
            WHEN public.get_my_role() IN ('teacher', 'tutor', 'monitor') THEN
                EXISTS (
                    SELECT 1 FROM public.lessons l
                    JOIN public.groups g ON g.id = l.group_id
                    WHERE l.id = attendance.lesson_id
                      AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())
                )
            ELSE false
        END
    );

-- Admin: davomat yozuvini yaratish (cheklovsiz)
CREATE POLICY "admin_insert_attendance"
    ON public.attendance FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.groups g ON g.id = l.group_id
            WHERE l.id = attendance.lesson_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Teacher/Tutor/Monitor: davomat belgilash (faqat shu kungi dars)
CREATE POLICY "teacher_insert_attendance"
    ON public.attendance FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_my_role() IN ('teacher', 'tutor', 'monitor')
        AND EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.groups g ON g.id = l.group_id
            WHERE l.id = attendance.lesson_id
              AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())
              AND l.lesson_date >= CURRENT_DATE - INTERVAL '1 day'
        )
    );

-- Admin: davomatni yangilash (cheklovsiz)
CREATE POLICY "admin_update_attendance"
    ON public.attendance FOR UPDATE
    TO authenticated
    USING (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.groups g ON g.id = l.group_id
            WHERE l.id = attendance.lesson_id
              AND g.organization_id = public.get_my_organization_id()
        )
    )
    WITH CHECK (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.groups g ON g.id = l.group_id
            WHERE l.id = attendance.lesson_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );

-- Teacher/Tutor/Monitor: davomatni tahrirlash (24 soat ichida, faqat o'z guruhida)
CREATE POLICY "teacher_update_attendance"
    ON public.attendance FOR UPDATE
    TO authenticated
    USING (
        public.get_my_role() IN ('teacher', 'tutor', 'monitor')
        AND EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.groups g ON g.id = l.group_id
            WHERE l.id = attendance.lesson_id
              AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())
              -- 24 soat ichida tahrirlash mumkin
              AND l.lesson_date >= CURRENT_DATE - INTERVAL '1 day'
        )
    )
    WITH CHECK (
        public.get_my_role() IN ('teacher', 'tutor', 'monitor')
        AND EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.groups g ON g.id = l.group_id
            WHERE l.id = attendance.lesson_id
              AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())
              AND l.lesson_date >= CURRENT_DATE - INTERVAL '1 day'
        )
    );

-- Admin: davomat yozuvini o'chirish
CREATE POLICY "admin_delete_attendance"
    ON public.attendance FOR DELETE
    TO authenticated
    USING (
        public.get_my_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM public.lessons l
            JOIN public.groups g ON g.id = l.group_id
            WHERE l.id = attendance.lesson_id
              AND g.organization_id = public.get_my_organization_id()
        )
    );


-- ============================================================================
-- Done! RLS polisalari yaratildi ✅
-- Admin: o'z tashkilotida to'liq CRUD
-- Teacher: o'z guruhini o'qish + davomat belgilash (shu kun + 24h edit)
-- ============================================================================

-- ============================================================================
-- DAVOMAD — Davomat Boshqaruv Tizimi (Attendance Management System)
-- File: functions/generate_lessons.sql
-- Description: Schedules jadvalini o'qib, joriy hafta uchun darslar yaratadi
-- ============================================================================
-- Foydalanish:
--   SELECT public.generate_lessons();                    -- barcha guruhlar uchun
--   SELECT public.generate_lessons('group-uuid-here');   -- bitta guruh uchun
-- ============================================================================


-- ============================================================================
-- 1) generate_lessons() — Joriy hafta uchun darslar yaratish
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_lessons(
    p_group_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
    lesson_id   UUID,
    group_id    UUID,
    group_name  TEXT,
    lesson_date DATE,
    day_name    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
    v_created_by UUID;
    v_count      INT := 0;
BEGIN
    -- -----------------------------------------------------------------------
    -- Joriy haftaning boshlanish sanasini aniqlash (ISO: Dushanba = 1-kun)
    -- PostgreSQL date_trunc('week', ...) Dushanbadan boshlanadi
    -- -----------------------------------------------------------------------
    v_week_start := date_trunc('week', CURRENT_DATE)::date;

    -- -----------------------------------------------------------------------
    -- created_by ni aniqlash:
    --   1) Parametr sifatida berilgan bo'lsa — undan foydalanish
    --   2) auth.uid() mavjud bo'lsa — undan foydalanish
    --   3) NULL qoladi (cron job orqali chaqirilganda)
    -- -----------------------------------------------------------------------
    v_created_by := COALESCE(p_created_by, auth.uid());

    -- -----------------------------------------------------------------------
    -- Asosiy INSERT:
    -- schedules jadvalidan hafta kunlarini o'qib,
    -- mos sanalarni hisoblab, lessons ga yozish.
    -- ON CONFLICT — agar bu guruh + sana uchun dars mavjud bo'lsa, o'tkazib yuborish.
    -- -----------------------------------------------------------------------
    RETURN QUERY
    WITH schedule_dates AS (
        SELECT
            s.group_id,
            g.name AS group_name,
            s.day_of_week,
            -- day_of_week: 1=Dushanba, 2=Seshanba, ...
            -- week_start Dushanba bo'lgani uchun: week_start + (day_of_week - 1)
            v_week_start + (s.day_of_week - 1) AS target_date
        FROM public.schedules s
        JOIN public.groups g ON g.id = s.group_id
        WHERE
            -- Agar p_group_id berilgan bo'lsa, faqat shu guruh
            -- Aks holda barcha guruhlar
            (p_group_id IS NULL OR s.group_id = p_group_id)
    ),
    inserted AS (
        INSERT INTO public.lessons (group_id, title, lesson_date, created_by)
        SELECT
            sd.group_id,
            -- Avtomatik sarlavha: "Guruh nomi — Kun nomi"
            sd.group_name || ' — ' ||
            CASE sd.day_of_week
                WHEN 1 THEN 'Dushanba'
                WHEN 2 THEN 'Seshanba'
                WHEN 3 THEN 'Chorshanba'
                WHEN 4 THEN 'Payshanba'
                WHEN 5 THEN 'Juma'
                WHEN 6 THEN 'Shanba'
            END || ' darsi',
            sd.target_date,
            v_created_by
        FROM schedule_dates sd
        -- Faqat o'tib ketmagan yoki bugungi sanalar uchun
        WHERE sd.target_date >= CURRENT_DATE
        -- Agar allaqachon mavjud bo'lsa — o'tkazib yuborish
        ON CONFLICT (group_id, lesson_date) DO NOTHING
        RETURNING
            lessons.id,
            lessons.group_id,
            lessons.lesson_date
    )
    SELECT
        ins.id          AS lesson_id,
        ins.group_id    AS group_id,
        sd.group_name   AS group_name,
        ins.lesson_date AS lesson_date,
        CASE EXTRACT(ISODOW FROM ins.lesson_date)::int
            WHEN 1 THEN 'Dushanba'
            WHEN 2 THEN 'Seshanba'
            WHEN 3 THEN 'Chorshanba'
            WHEN 4 THEN 'Payshanba'
            WHEN 5 THEN 'Juma'
            WHEN 6 THEN 'Shanba'
            WHEN 7 THEN 'Yakshanba'
        END AS day_name
    FROM inserted ins
    JOIN schedule_dates sd ON sd.group_id = ins.group_id
                          AND sd.target_date = ins.lesson_date;

END;
$$;

COMMENT ON FUNCTION public.generate_lessons(UUID, UUID) IS
    'Schedules jadvalini o''qib, joriy hafta uchun darslarni avtomatik yaratadi. '
    'Mavjud darslarni o''tkazib yuboradi (ON CONFLICT DO NOTHING). '
    'p_group_id = NULL bo''lsa barcha guruhlar uchun ishlaydi.';


-- ============================================================================
-- 2) generate_lessons_for_week() — Ma'lum hafta uchun darslar yaratish
-- Kelajak yoki o'tgan haftalar uchun ham dars yaratish imkoniyati
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_lessons_for_week(
    p_week_start DATE,
    p_group_id   UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
    lesson_id   UUID,
    group_id    UUID,
    group_name  TEXT,
    lesson_date DATE,
    day_name    TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_week_start DATE;
    v_created_by UUID;
BEGIN
    -- -----------------------------------------------------------------------
    -- Berilgan sanani haftaning boshiga tushirish (Dushanba)
    -- -----------------------------------------------------------------------
    v_week_start := date_trunc('week', p_week_start)::date;
    v_created_by := COALESCE(p_created_by, auth.uid());

    RETURN QUERY
    WITH schedule_dates AS (
        SELECT
            s.group_id,
            g.name AS group_name,
            s.day_of_week,
            v_week_start + (s.day_of_week - 1) AS target_date
        FROM public.schedules s
        JOIN public.groups g ON g.id = s.group_id
        WHERE (p_group_id IS NULL OR s.group_id = p_group_id)
    ),
    inserted AS (
        INSERT INTO public.lessons (group_id, title, lesson_date, created_by)
        SELECT
            sd.group_id,
            sd.group_name || ' — ' ||
            CASE sd.day_of_week
                WHEN 1 THEN 'Dushanba'
                WHEN 2 THEN 'Seshanba'
                WHEN 3 THEN 'Chorshanba'
                WHEN 4 THEN 'Payshanba'
                WHEN 5 THEN 'Juma'
                WHEN 6 THEN 'Shanba'
            END || ' darsi',
            sd.target_date,
            v_created_by
        FROM schedule_dates sd
        ON CONFLICT (group_id, lesson_date) DO NOTHING
        RETURNING
            lessons.id,
            lessons.group_id,
            lessons.lesson_date
    )
    SELECT
        ins.id          AS lesson_id,
        ins.group_id    AS group_id,
        sd.group_name   AS group_name,
        ins.lesson_date AS lesson_date,
        CASE EXTRACT(ISODOW FROM ins.lesson_date)::int
            WHEN 1 THEN 'Dushanba'
            WHEN 2 THEN 'Seshanba'
            WHEN 3 THEN 'Chorshanba'
            WHEN 4 THEN 'Payshanba'
            WHEN 5 THEN 'Juma'
            WHEN 6 THEN 'Shanba'
            WHEN 7 THEN 'Yakshanba'
        END AS day_name
    FROM inserted ins
    JOIN schedule_dates sd ON sd.group_id = ins.group_id
                          AND sd.target_date = ins.lesson_date;
END;
$$;

COMMENT ON FUNCTION public.generate_lessons_for_week(DATE, UUID, UUID) IS
    'Berilgan hafta uchun darslarni yaratadi. '
    'p_week_start = istalgan sana (Dushanbaga tushiriladi). '
    'Kelajak haftalar uchun oldindan dars yaratish uchun ishlatiladi.';


-- ============================================================================
-- Done! generate_lessons funksiyalari yaratildi ✅
--
-- Foydalanish misollari:
--   -- Joriy hafta, barcha guruhlar:
--   SELECT * FROM public.generate_lessons();
--
--   -- Joriy hafta, bitta guruh:
--   SELECT * FROM public.generate_lessons('cccccccc-cccc-cccc-cccc-cccccccccc01');
--
--   -- Kelasi hafta uchun:
--   SELECT * FROM public.generate_lessons_for_week(CURRENT_DATE + INTERVAL '7 days');
--
--   -- Supabase cron job (pg_cron) orqali har Dushanba avtomatik chaqirish:
--   -- SELECT cron.schedule(
--   --     'generate-weekly-lessons',
--   --     '0 6 * * 1',  -- Har Dushanba soat 06:00
--   --     $$SELECT public.generate_lessons()$$
--   -- );
-- ============================================================================

-- ============================================================================
-- DAVOMAD — Davomat Boshqaruv Tizimi (Attendance Management System)
-- File: seed.sql
-- Description: Demo/test ma'lumotlari
--   1 tashkilot, 1 admin, 2 o'qituvchi, 2 guruh, 10 talaba,
--   dars jadvallari, darslar, davomat yozuvlari
-- ============================================================================
-- MUHIM: Bu fayl faqat development/demo uchun mo'ljallangan.
-- Production bazasida ishlatmang!
-- ============================================================================


-- ============================================================================
-- 0) UUID KONSTANTALAR
-- Barcha ID larni oldindan belgilaymiz — foreign key lar to'g'ri ishlashi uchun
-- ============================================================================

-- Tashkilot
-- org_id = '11111111-1111-1111-1111-111111111111'

-- Admin foydalanuvchi
-- admin_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

-- O'qituvchilar
-- teacher1_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'
-- teacher2_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'

-- Guruhlar
-- group1_id = 'cccccccc-cccc-cccc-cccc-cccccccccc01'
-- group2_id = 'cccccccc-cccc-cccc-cccc-cccccccccc02'

-- Talabalar (user_id lari)
-- student_user_01..10 = 'dddddddd-dddd-dddd-dddd-dddddddddd01'..'10'

-- Student jadval ID lari
-- student_01..10 = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01'..'10'

-- Dars ID lari
-- lesson_g1_01..03 = 'ffffffff-ffff-ffff-1111-ffffffffffff' prefix
-- lesson_g2_01..03 = 'ffffffff-ffff-ffff-2222-ffffffffffff' prefix


-- ============================================================================
-- 1) TASHKILOT — Organization
-- ============================================================================
INSERT INTO public.organizations (id, name, phone, address) VALUES
    ('11111111-1111-1111-1111-111111111111',
     'O''zBA huzuridagi markaz',
     '+998 71 200 00 01',
     'Toshkent sh., Chilonzor tumani, 7-mavze, 15-uy');


-- ============================================================================
-- 2) AUTH USERS — Supabase auth.users ga demo foydalanuvchilar
-- MUHIM: Bu INSERT faqat local development uchun ishlaydi.
-- Production da auth.users ni Supabase Dashboard orqali boshqarish kerak.
-- ============================================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
VALUES
    -- Admin
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'admin@itacademy.uz',
     crypt('Admin123!', gen_salt('bf')),
     now(), 'authenticated', 'authenticated', now(), now()),

    -- Teacher 1
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
     'teacher1@itacademy.uz',
     crypt('Teacher123!', gen_salt('bf')),
     now(), 'authenticated', 'authenticated', now(), now()),

    -- Teacher 2
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
     'teacher2@itacademy.uz',
     crypt('Teacher123!', gen_salt('bf')),
     now(), 'authenticated', 'authenticated', now(), now()),

    -- Students 01-10
    ('dddddddd-dddd-dddd-dddd-dddddddddd01', 'student01@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'student02@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd03', 'student03@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd04', 'student04@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd05', 'student05@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd06', 'student06@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd07', 'student07@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd08', 'student08@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd09', 'student09@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now()),
    ('dddddddd-dddd-dddd-dddd-dddddddddd10', 'student10@itacademy.uz',
     crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());

-- auth.identities (Supabase email auth uchun zarur)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email',
     jsonb_build_object('sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'admin@itacademy.uz'), now(), now(), now()),
    (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'email',
     jsonb_build_object('sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'email', 'teacher1@itacademy.uz'), now(), now(), now()),
    (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'email',
     jsonb_build_object('sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'email', 'teacher2@itacademy.uz'), now(), now(), now());


-- ============================================================================
-- 3) PUBLIC USERS — Foydalanuvchilar profillari
-- ============================================================================
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES
    -- Admin
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     '11111111-1111-1111-1111-111111111111',
     'Karimov Jasur Bahodirovich',
     'admin@itacademy.uz',
     '+998 90 100 00 01',
     'admin'),

    -- Tutor 1
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
     '11111111-1111-1111-1111-111111111111',
     'Raxmatullayev Sardor Anvarovich',
     'teacher1@itacademy.uz',
     '+998 90 200 00 01',
     'tutor'),

    -- Tutor 2
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
     '11111111-1111-1111-1111-111111111111',
     'Tursunova Nilufar Shavkatovna',
     'teacher2@itacademy.uz',
     '+998 90 200 00 02',
     'tutor'),

    -- Students 01-10 (01 and 06 are monitors)
    ('dddddddd-dddd-dddd-dddd-dddddddddd01', '11111111-1111-1111-1111-111111111111',
     'Abdullayev Bobur Kamolovich', 'student01@itacademy.uz', '+998 90 300 00 01', 'monitor'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd02', '11111111-1111-1111-1111-111111111111',
     'Mahmudova Dildora Rustamovna', 'student02@itacademy.uz', '+998 90 300 00 02', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd03', '11111111-1111-1111-1111-111111111111',
     'Xasanov Sherzod Ulug''bekovich', 'student03@itacademy.uz', '+998 90 300 00 03', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd04', '11111111-1111-1111-1111-111111111111',
     'Ergasheva Madina Faxriddinovna', 'student04@itacademy.uz', '+998 90 300 00 04', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd05', '11111111-1111-1111-1111-111111111111',
     'Normatov Javohir Abdurashidovich', 'student05@itacademy.uz', '+998 90 300 00 05', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd06', '11111111-1111-1111-1111-111111111111',
     'Qobilov Otabek Muzaffarovich', 'student06@itacademy.uz', '+998 90 300 00 06', 'monitor'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd07', '11111111-1111-1111-1111-111111111111',
     'Saidova Zulfiya Bakhodirovna', 'student07@itacademy.uz', '+998 90 300 00 07', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd08', '11111111-1111-1111-1111-111111111111',
     'Raximov Dostonbek Ilhomovich', 'student08@itacademy.uz', '+998 90 300 00 08', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd09', '11111111-1111-1111-1111-111111111111',
     'Umarova Shahnoza Alisher qizi', 'student09@itacademy.uz', '+998 90 300 00 09', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd10', '11111111-1111-1111-1111-111111111111',
     'To''rayev Sanjar Shuxratovich', 'student10@itacademy.uz', '+998 90 300 00 10', 'student');


-- ============================================================================
-- 4) GURUHLAR — Groups
-- ============================================================================
INSERT INTO public.groups (id, organization_id, tutor_id, monitor_id, name, course_name) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccc01',
     '11111111-1111-1111-1111-111111111111',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', -- Tutor 1
     'dddddddd-dddd-dddd-dddd-dddddddddd01', -- Monitor 1 (student 01)
     'PY-101',
     'Python Backend'),

    ('cccccccc-cccc-cccc-cccc-cccccccccc02',
     '11111111-1111-1111-1111-111111111111',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', -- Tutor 2
     'dddddddd-dddd-dddd-dddd-dddddddddd06', -- Monitor 2 (student 06)
     'FR-201',
     'Frontend React');


-- ============================================================================
-- 5) DARS JADVALI — Schedules
-- PY-101: Dushanba, Chorshanba, Juma (10:00-12:00)
-- FR-201: Seshanba, Payshanba, Shanba (14:00-16:00)
-- ============================================================================
INSERT INTO public.schedules (group_id, day_of_week, start_time, end_time) VALUES
    -- PY-101 jadvali
    ('cccccccc-cccc-cccc-cccc-cccccccccc01', 1, '10:00', '12:00'),  -- Dushanba
    ('cccccccc-cccc-cccc-cccc-cccccccccc01', 3, '10:00', '12:00'),  -- Chorshanba
    ('cccccccc-cccc-cccc-cccc-cccccccccc01', 5, '10:00', '12:00'),  -- Juma

    -- FR-201 jadvali
    ('cccccccc-cccc-cccc-cccc-cccccccccc02', 2, '14:00', '16:00'),  -- Seshanba
    ('cccccccc-cccc-cccc-cccc-cccccccccc02', 4, '14:00', '16:00'),  -- Payshanba
    ('cccccccc-cccc-cccc-cccc-cccccccccc02', 6, '14:00', '16:00');  -- Shanba


-- ============================================================================
-- 6) TALABALAR — Students (guruhlarga biriktirish)
-- PY-101: 5 talaba (student 01-05)
-- FR-201: 5 talaba (student 06-10)
-- ============================================================================
INSERT INTO public.students (id, user_id, group_id, status) VALUES
    -- PY-101 guruhi
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'dddddddd-dddd-dddd-dddd-dddddddddd01', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', 'dddddddd-dddd-dddd-dddd-dddddddddd02', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'dddddddd-dddd-dddd-dddd-dddddddddd03', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04', 'dddddddd-dddd-dddd-dddd-dddddddddd04', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee05', 'dddddddd-dddd-dddd-dddd-dddddddddd05', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'active'),

    -- FR-201 guruhi
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee06', 'dddddddd-dddd-dddd-dddd-dddddddddd06', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee07', 'dddddddd-dddd-dddd-dddd-dddddddddd07', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee08', 'dddddddd-dddd-dddd-dddd-dddddddddd08', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee09', 'dddddddd-dddd-dddd-dddd-dddddddddd09', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee10', 'dddddddd-dddd-dddd-dddd-dddddddddd10', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'active');


-- ============================================================================
-- 7) DARSLAR — Lessons
-- Joriy hafta uchun demo darslar (CURRENT_DATE asosida)
-- ============================================================================

-- PY-101 darslari (Dushanba, Chorshanba, Juma — shu hafta)
INSERT INTO public.lessons (id, group_id, title, lesson_date, created_by) VALUES
    ('ffffffff-ffff-ffff-1111-ffffffffffff',
     'cccccccc-cccc-cccc-cccc-cccccccccc01',
     'Python asoslari — O''zgaruvchilar va turlar',
     -- Shu haftaning Dushanbasi
     date_trunc('week', CURRENT_DATE)::date,
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

    ('ffffffff-ffff-ffff-1111-fffffffffff2',
     'cccccccc-cccc-cccc-cccc-cccccccccc01',
     'Python — Shart operatorlari (if/elif/else)',
     -- Shu haftaning Chorshanbasi
     (date_trunc('week', CURRENT_DATE) + INTERVAL '2 days')::date,
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

    ('ffffffff-ffff-ffff-1111-fffffffffff3',
     'cccccccc-cccc-cccc-cccc-cccccccccc01',
     'Python — Sikllar (for/while)',
     -- Shu haftaning Jumasi
     (date_trunc('week', CURRENT_DATE) + INTERVAL '4 days')::date,
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

-- FR-201 darslari (Seshanba, Payshanba, Shanba — shu hafta)
    ('ffffffff-ffff-ffff-2222-ffffffffffff',
     'cccccccc-cccc-cccc-cccc-cccccccccc02',
     'React — JSX va Komponentlar',
     -- Shu haftaning Seshanbasi
     (date_trunc('week', CURRENT_DATE) + INTERVAL '1 day')::date,
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

    ('ffffffff-ffff-ffff-2222-fffffffffff2',
     'cccccccc-cccc-cccc-cccc-cccccccccc02',
     'React — Props va State',
     -- Shu haftaning Payshanbasi
     (date_trunc('week', CURRENT_DATE) + INTERVAL '3 days')::date,
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),

    ('ffffffff-ffff-ffff-2222-fffffffffff3',
     'cccccccc-cccc-cccc-cccc-cccccccccc02',
     'React — useEffect va Hooks',
     -- Shu haftaning Shanbasi
     (date_trunc('week', CURRENT_DATE) + INTERVAL '5 days')::date,
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');


-- ============================================================================
-- 8) DAVOMAT — Attendance (Dushanba darslari uchun namuna)
-- ============================================================================

-- PY-101 Dushanba darsi — 5 talaba uchun davomat
INSERT INTO public.attendance (lesson_id, student_id, status, marked_by) VALUES
    ('ffffffff-ffff-ffff-1111-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'present',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'),
    ('ffffffff-ffff-ffff-1111-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', 'present',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'),
    ('ffffffff-ffff-ffff-1111-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'absent',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'),
    ('ffffffff-ffff-ffff-1111-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04', 'late',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'),
    ('ffffffff-ffff-ffff-1111-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee05', 'present',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01');

-- FR-201 Seshanba darsi — 5 talaba uchun davomat
INSERT INTO public.attendance (lesson_id, student_id, status, marked_by) VALUES
    ('ffffffff-ffff-ffff-2222-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee06', 'present',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'),
    ('ffffffff-ffff-ffff-2222-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee07', 'present',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'),
    ('ffffffff-ffff-ffff-2222-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee08', 'present',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'),
    ('ffffffff-ffff-ffff-2222-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee09', 'absent',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'),
    ('ffffffff-ffff-ffff-2222-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee10', 'late',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02');


-- ============================================================================
-- Demo ma'lumotlar yaratildi ✅
-- Login ma'lumotlari:
--   Admin:    admin@itacademy.uz     / [Xavfsizlik uchun olib tashlandi]
--   Teacher1: teacher1@itacademy.uz  / [Xavfsizlik uchun olib tashlandi]
--   Teacher2: teacher2@itacademy.uz  / [Xavfsizlik uchun olib tashlandi]
-- ============================================================================
