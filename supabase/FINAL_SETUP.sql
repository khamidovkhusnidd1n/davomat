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

-- Rangtasvir guruhini kiritish

INSERT INTO public.groups (id, organization_id, name, course_name) VALUES ('7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', '11111111-1111-1111-1111-111111111111', 'Rangtasvir 14-guruh', 'Rangtasvir malaka oshirish');

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('9a3db78e-96a8-4b3d-840c-aea01cf1c468', 'alimov@itacademy.uz', crypt('Teacher123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('9a3db78e-96a8-4b3d-840c-aea01cf1c468', '11111111-1111-1111-1111-111111111111', 'Alimov Umid', 'alimov@itacademy.uz', 'teacher');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('24d1101c-8491-43f4-a175-91dca65af3d2', 'sultanov@itacademy.uz', crypt('Teacher123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('24d1101c-8491-43f4-a175-91dca65af3d2', '11111111-1111-1111-1111-111111111111', 'Sultanov Shavkat', 'sultanov@itacademy.uz', 'teacher');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('9e1c0127-9da0-4997-8df9-d1f5f8138565', 'qiyomov@itacademy.uz', crypt('Teacher123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('9e1c0127-9da0-4997-8df9-d1f5f8138565', '11111111-1111-1111-1111-111111111111', 'Qiyomov Zuhriddin', 'qiyomov@itacademy.uz', 'teacher');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('122f314b-5d67-4acd-9a97-0ed16fe335d6', 'lashyanov@itacademy.uz', crypt('Teacher123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('122f314b-5d67-4acd-9a97-0ed16fe335d6', '11111111-1111-1111-1111-111111111111', 'Lashyanov Timur', 'lashyanov@itacademy.uz', 'teacher');

-- Lessons
INSERT INTO public.lessons (id, group_id, title, lesson_date, created_by) VALUES 
  ('cf7e9ef0-123a-4986-8363-574af3827c02', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'Rangtasvir', '2026-07-20', '9a3db78e-96a8-4b3d-840c-aea01cf1c468'),
  ('a2ee79e1-a83b-485d-b8a0-5d7de246546e', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'Art marketing', '2026-07-21', '24d1101c-8491-43f4-a175-91dca65af3d2'),
  ('b120869e-e296-492d-a41e-9c37952c6664', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'Chizmatasvir', '2026-07-22', '9e1c0127-9da0-4997-8df9-d1f5f8138565'),
  ('f1a73a62-efd3-4cbf-852c-e1768e82029f', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'Kompozitsiya', '2026-07-23', '122f314b-5d67-4acd-9a97-0ed16fe335d6');

-- Students
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('edbd5005-4ecc-4602-814c-1080e9a50faf', 'student1@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('edbd5005-4ecc-4602-814c-1080e9a50faf', '11111111-1111-1111-1111-111111111111', 'Abdukodirova  Kamola  Bvxodirjon  kizi', 'student1@app.local', '909490392', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('8d46f050-37c2-44c5-8aad-30966635080f', 'edbd5005-4ecc-4602-814c-1080e9a50faf', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('a17ed8ae-0661-48d9-b836-4fa311dbbe07', 'student2@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('a17ed8ae-0661-48d9-b836-4fa311dbbe07', '11111111-1111-1111-1111-111111111111', 'Aripova  Madina  Tursunalievna', 'student2@app.local', '977509245', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('05b5c862-e0cd-482f-a0b4-f3baf138bea4', 'a17ed8ae-0661-48d9-b836-4fa311dbbe07', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('1b523f27-d79a-4264-ad22-94e12e450729', 'student3@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('1b523f27-d79a-4264-ad22-94e12e450729', '11111111-1111-1111-1111-111111111111', 'Axmadaliev  Farrux  Fayzullaxanovich', 'student3@app.local', '946510708', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('8fbfd8d8-4e2f-480a-82a3-8bdc38407804', '1b523f27-d79a-4264-ad22-94e12e450729', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('13024bfb-52c0-4314-908a-715f2a4ae644', 'student4@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('13024bfb-52c0-4314-908a-715f2a4ae644', '11111111-1111-1111-1111-111111111111', 'Bozorova  Nargiz  Abduganievna', 'student4@app.local', '998721786', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('8df3ffd6-0dad-4c59-a327-6e2dbd47e94e', '13024bfb-52c0-4314-908a-715f2a4ae644', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('c3298869-355a-4c1f-a1c8-12155811f19e', 'student5@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('c3298869-355a-4c1f-a1c8-12155811f19e', '11111111-1111-1111-1111-111111111111', 'Zokirov  Shokir  Sobitovich', 'student5@app.local', '909100409', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('e5a9c0ea-707e-492a-997a-edd9a0793900', 'c3298869-355a-4c1f-a1c8-12155811f19e', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('b2cc2cce-a8ad-48c9-a506-5c716752d2b7', 'student6@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('b2cc2cce-a8ad-48c9-a506-5c716752d2b7', '11111111-1111-1111-1111-111111111111', 'Zokirova  Ma’mura  Abdusamatovna', 'student6@app.local', '909965544', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('4fb6bbe3-3abf-4d4a-a3b9-53f96227f7fa', 'b2cc2cce-a8ad-48c9-a506-5c716752d2b7', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('06691ec8-c5c2-46f7-9662-553919e6ecbf', 'student7@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('06691ec8-c5c2-46f7-9662-553919e6ecbf', '11111111-1111-1111-1111-111111111111', 'Maxmudov  Mirshod  Nusratovich', 'student7@app.local', '901681926', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('aa16177e-91cb-4e52-b273-a77afebc0dc4', '06691ec8-c5c2-46f7-9662-553919e6ecbf', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('0d54d4bf-43f2-4999-872a-25ae0aaee446', 'student8@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('0d54d4bf-43f2-4999-872a-25ae0aaee446', '11111111-1111-1111-1111-111111111111', 'Po‘latova  Muqaddasxon  Biloldinovna', 'student8@app.local', '909474837', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('d66da99d-cd31-487f-bb65-ae9c87d1cec7', '0d54d4bf-43f2-4999-872a-25ae0aaee446', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('9ee6e77d-050f-4a71-ab1f-43efae6072f7', 'student9@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('9ee6e77d-050f-4a71-ab1f-43efae6072f7', '11111111-1111-1111-1111-111111111111', 'Rahmonov  Shuhrat  Obidjon o‘g‘li', 'student9@app.local', '943575858979029095', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('9f5c4638-c64c-4bd0-9369-971ac8a201e9', '9ee6e77d-050f-4a71-ab1f-43efae6072f7', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('1d15c940-0603-47a9-b167-d0bfb4f1a5d0', 'student10@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('1d15c940-0603-47a9-b167-d0bfb4f1a5d0', '11111111-1111-1111-1111-111111111111', 'Raximova  Gulxexra  Saminovna', 'student10@app.local', '900393973', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('61944aed-f2e4-4af3-bd40-19efb6bc2cbf', '1d15c940-0603-47a9-b167-d0bfb4f1a5d0', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('04d1b7e1-ee8b-43fe-a4f1-440d0764c3ad', 'student11@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('04d1b7e1-ee8b-43fe-a4f1-440d0764c3ad', '11111111-1111-1111-1111-111111111111', 'Ro‘zimov  Rashid  Siylxonovich', 'student11@app.local', '945890329', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('76264f87-2454-4f0b-96ac-55af204b466a', '04d1b7e1-ee8b-43fe-a4f1-440d0764c3ad', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('ffb18b82-c780-4af7-bbed-d65b1f3ec1d5', 'student12@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('ffb18b82-c780-4af7-bbed-d65b1f3ec1d5', '11111111-1111-1111-1111-111111111111', 'Saidova  Bonu  Alisher qizi', 'student12@app.local', '998609437', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('18fffd46-7da4-45da-9710-f3720aba7fcb', 'ffb18b82-c780-4af7-bbed-d65b1f3ec1d5', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('a8d8e455-a94f-4fbd-855d-174048c9d29a', 'student13@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('a8d8e455-a94f-4fbd-855d-174048c9d29a', '11111111-1111-1111-1111-111111111111', 'Toshmuradova  Komila Kiyomiddinovna', 'student13@app.local', '999307442', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('4442fc09-4188-4e59-9f93-950f79f15f96', 'a8d8e455-a94f-4fbd-855d-174048c9d29a', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('f6a1fec1-642a-4bd1-90df-c6f8493342c3', 'student14@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('f6a1fec1-642a-4bd1-90df-c6f8493342c3', '11111111-1111-1111-1111-111111111111', 'Xolikov  Mirjalol   Raxmatulla o‘g‘li', 'student14@app.local', '915008893', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('1d72dacf-1e81-4567-a764-5ea977ad4b84', 'f6a1fec1-642a-4bd1-90df-c6f8493342c3', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('b44f6964-4b88-483a-8f2b-09fcc86bad1a', 'student15@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('b44f6964-4b88-483a-8f2b-09fcc86bad1a', '11111111-1111-1111-1111-111111111111', 'Xolikberdiev  Sardorbek  Rustam o‘g‘li', 'student15@app.local', '987123553', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('ebdfce97-7054-4ca4-803b-6f6a118d2e99', 'b44f6964-4b88-483a-8f2b-09fcc86bad1a', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('305abff5-3ee1-4f4e-b4a4-6383a42ea6ac', 'student16@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('305abff5-3ee1-4f4e-b4a4-6383a42ea6ac', '11111111-1111-1111-1111-111111111111', 'Shamsutdinov  Baxriddin  Xayitvaevich', 'student16@app.local', '998876669', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('beb0fc5e-2295-441a-a4e0-dc1b6a724327', '305abff5-3ee1-4f4e-b4a4-6383a42ea6ac', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('91807e96-780f-4f6f-8440-cf23b2c10cbc', 'student17@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('91807e96-780f-4f6f-8440-cf23b2c10cbc', '11111111-1111-1111-1111-111111111111', 'Sadirova  Shaxnoza Luxmanovna', 'student17@app.local', '993075078', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('aac26bbd-9ebf-4cda-bf4a-666e5b4f4124', '91807e96-780f-4f6f-8440-cf23b2c10cbc', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('458929c7-dcbd-475d-bf14-665df3742b9c', 'student18@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('458929c7-dcbd-475d-bf14-665df3742b9c', '11111111-1111-1111-1111-111111111111', 'Ergasheva  Oqibat Talatovna', 'student18@app.local', '909510233', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('7f774eb8-ac2b-44af-abf7-dbf92d2102ab', '458929c7-dcbd-475d-bf14-665df3742b9c', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('036db5aa-2f9a-4818-812b-22c8cca94e0d', 'student19@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('036db5aa-2f9a-4818-812b-22c8cca94e0d', '11111111-1111-1111-1111-111111111111', 'Mavlonov  Muzaffar Maxmudovich', 'student19@app.local', '977341252', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('c11be0dd-3592-4684-a18a-aea44fd8eb64', '036db5aa-2f9a-4818-812b-22c8cca94e0d', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('69d581e1-f2ef-4de0-bc63-ed206356a29f', 'student20@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('69d581e1-f2ef-4de0-bc63-ed206356a29f', '11111111-1111-1111-1111-111111111111', 'Ibragimova Indira Iskandarovna', 'student20@app.local', '334708228', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('848136ae-db95-4024-b763-2c4e9fc52486', '69d581e1-f2ef-4de0-bc63-ed206356a29f', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('e970bc73-0b1b-41c3-91e1-00a67bd18641', 'student21@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('e970bc73-0b1b-41c3-91e1-00a67bd18641', '11111111-1111-1111-1111-111111111111', 'Mirzayeva Sayyora Baxtiyorovna', 'student21@app.local', '973424542', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('5ae00ba8-d268-42b4-b6ee-dd64d2916d17', 'e970bc73-0b1b-41c3-91e1-00a67bd18641', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('1e8a463a-cdbf-4036-9307-440266234405', 'student22@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('1e8a463a-cdbf-4036-9307-440266234405', '11111111-1111-1111-1111-111111111111', 'Kim Yuriy Nikolayevich', 'student22@app.local', '996437858', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('7e36a7d7-8fe4-4ead-8f6d-3bbd125ce418', '1e8a463a-cdbf-4036-9307-440266234405', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('5ef0853d-e21b-48bd-be99-72b570d6c0db', 'student23@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('5ef0853d-e21b-48bd-be99-72b570d6c0db', '11111111-1111-1111-1111-111111111111', 'Qoirova Nargizaxon Muzaffarovna', 'student23@app.local', '903487100', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('198ddf6a-b4f2-4c4a-b81f-b01292353ead', '5ef0853d-e21b-48bd-be99-72b570d6c0db', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('7ab4bd56-0155-4430-9bc9-2640427a8aaa', 'student24@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('7ab4bd56-0155-4430-9bc9-2640427a8aaa', '11111111-1111-1111-1111-111111111111', 'Kosimova Dilnoza Zafarovna', 'student24@app.local', '909669282', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('7a921b87-18ce-462b-9de3-44698d9f832c', '7ab4bd56-0155-4430-9bc9-2640427a8aaa', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('ed83c72d-fd2e-4195-80ad-6fef1eccf4d3', 'student25@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('ed83c72d-fd2e-4195-80ad-6fef1eccf4d3', '11111111-1111-1111-1111-111111111111', 'Muxamedova Gulnozaxon Muxammadovna', 'student25@app.local', '909930655', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('bc8ab49c-5b29-4371-bd78-2933be5313f4', 'ed83c72d-fd2e-4195-80ad-6fef1eccf4d3', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('6e92a2ce-dd12-417e-807f-d8a6156e9dcc', 'student26@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('6e92a2ce-dd12-417e-807f-d8a6156e9dcc', '11111111-1111-1111-1111-111111111111', 'Kenjayev Xudoyberdi Muzaffar og''li', 'student26@app.local', '909732572', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('46b18212-ec63-4775-b658-743727669f12', '6e92a2ce-dd12-417e-807f-d8a6156e9dcc', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('db067447-5153-4904-a683-4625b9e5c47c', 'student27@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('db067447-5153-4904-a683-4625b9e5c47c', '11111111-1111-1111-1111-111111111111', 'Tillabayeva Ziyoda Kamildjanova', 'student27@app.local', '977748710', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('408f286a-dea2-4f0d-94e5-18e44900e9b8', 'db067447-5153-4904-a683-4625b9e5c47c', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('202975b6-778e-4fdd-a194-0c3d2437b580', 'student28@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('202975b6-778e-4fdd-a194-0c3d2437b580', '11111111-1111-1111-1111-111111111111', 'Baxramova Oxistaxon Nazirjon qizi', 'student28@app.local', '935410635', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('92f7d602-51cd-480b-9737-b3321a6ac24f', '202975b6-778e-4fdd-a194-0c3d2437b580', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('546a920a-9734-4cd4-bfad-8dad5a1296de', 'student29@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('546a920a-9734-4cd4-bfad-8dad5a1296de', '11111111-1111-1111-1111-111111111111', 'Shanazarov  Farrux  Xolbutayevich', 'student29@app.local', '901754402', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('9c237ca9-1743-4a2c-89da-179553220217', '546a920a-9734-4cd4-bfad-8dad5a1296de', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('ce06e396-c073-4467-8897-57d5123041f4', 'student30@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('ce06e396-c073-4467-8897-57d5123041f4', '11111111-1111-1111-1111-111111111111', 'Raxmonov Shoxruz Kamol o''g''li', 'student30@app.local', '911656336', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('07fea036-a053-4292-b8fa-87ebe2ef6e31', 'ce06e396-c073-4467-8897-57d5123041f4', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('358482fe-47fa-44c4-8cfc-f6e097643ec7', 'student31@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('358482fe-47fa-44c4-8cfc-f6e097643ec7', '11111111-1111-1111-1111-111111111111', 'Ruzmatov Qodirali  Ortigaliyevich', 'student31@app.local', '946956869', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('577e9feb-0d53-4185-a52a-5ea1b1d6818f', '358482fe-47fa-44c4-8cfc-f6e097643ec7', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('91895751-622b-42ce-9de7-e0cf4c34ba5c', 'student32@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('91895751-622b-42ce-9de7-e0cf4c34ba5c', '11111111-1111-1111-1111-111111111111', 'Raximov  Muxammadali Alijon o''g''li', 'student32@app.local', '905707404', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('fff2730c-f2da-4349-be43-19f74340fc44', '91895751-622b-42ce-9de7-e0cf4c34ba5c', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('0d02b608-7dc3-4a7e-a20c-af173a68c0f4', 'student33@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('0d02b608-7dc3-4a7e-a20c-af173a68c0f4', '11111111-1111-1111-1111-111111111111', 'Isakdjanova  Shaxnoza Rashidovna', 'student33@app.local', '971228588', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('3d8c15e8-7e37-4f2a-bdac-d581a694c05c', '0d02b608-7dc3-4a7e-a20c-af173a68c0f4', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('ade206d6-9d6d-4c49-b3c0-7f942421a311', 'student34@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('ade206d6-9d6d-4c49-b3c0-7f942421a311', '11111111-1111-1111-1111-111111111111', 'Muminova Saodat Tuxtayevna', 'student34@app.local', '946657620', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('e00219cb-8180-4cae-8e84-d08c301d8d9a', 'ade206d6-9d6d-4c49-b3c0-7f942421a311', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('5741eaae-3f41-4eff-b2df-0c65b7366b4f', 'student35@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('5741eaae-3f41-4eff-b2df-0c65b7366b4f', '11111111-1111-1111-1111-111111111111', 'Nurimbetov Bayram Karlıbaevich', 'student35@app.local', '999519427', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('4e13b559-fdb3-49ec-a95b-294d3b2dc9e4', '5741eaae-3f41-4eff-b2df-0c65b7366b4f', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('e8bb6f55-3c8b-49fa-a56e-e0731989e8db', 'student36@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('e8bb6f55-3c8b-49fa-a56e-e0731989e8db', '11111111-1111-1111-1111-111111111111', 'Turkmenbaev Baxadir Nurulla o‘g‘li', 'student36@app.local', '913896508', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('da6dab2d-9329-405a-9805-a90f270fcd62', 'e8bb6f55-3c8b-49fa-a56e-e0731989e8db', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('de82a856-4aae-4e56-92f2-17c5343955e9', 'student37@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('de82a856-4aae-4e56-92f2-17c5343955e9', '11111111-1111-1111-1111-111111111111', 'Yusupov Azat Joldasovich', 'student37@app.local', '933665739', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('e1630a91-7ae7-485a-b49b-f33f68316925', 'de82a856-4aae-4e56-92f2-17c5343955e9', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('d9fa6598-a67a-4544-b6ae-6ecfebe761a9', 'student38@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('d9fa6598-a67a-4544-b6ae-6ecfebe761a9', '11111111-1111-1111-1111-111111111111', 'Shukurullaev Najimaddin Janabaevich', 'student38@app.local', '937773039', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('09a1a9e4-e38b-426f-8c33-36aa70131b5c', 'd9fa6598-a67a-4544-b6ae-6ecfebe761a9', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('e0e5529f-5f12-4bd4-9279-6fba57a95d11', 'student39@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('e0e5529f-5f12-4bd4-9279-6fba57a95d11', '11111111-1111-1111-1111-111111111111', 'Davletova Maksuda Maksetovna', 'student39@app.local', '913050924', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('40af8039-d0ec-4064-a47b-6808c8868e09', 'e0e5529f-5f12-4bd4-9279-6fba57a95d11', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('3ce3d876-a3d2-421a-92c3-28b87ea90c10', 'student40@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('3ce3d876-a3d2-421a-92c3-28b87ea90c10', '11111111-1111-1111-1111-111111111111', 'Djanibekova Gulbanu Djanabay qizi', 'student40@app.local', '907004040', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('85645c4f-1f57-4667-9897-844549c8310b', '3ce3d876-a3d2-421a-92c3-28b87ea90c10', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('95c4a60e-de66-4883-ba54-f5e0dfbc1191', 'student41@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('95c4a60e-de66-4883-ba54-f5e0dfbc1191', '11111111-1111-1111-1111-111111111111', 'Jurayev  Baxtiyor  Baxodirovich', 'student41@app.local', '936981015', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('cdc2237c-f295-48a7-b7e0-e31c08a4e7aa', '95c4a60e-de66-4883-ba54-f5e0dfbc1191', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('8b2d6dc7-5853-4014-b163-38e527b4e523', 'student42@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('8b2d6dc7-5853-4014-b163-38e527b4e523', '11111111-1111-1111-1111-111111111111', 'Jurayeva  Muxayyo  Djuraboyevna', 'student42@app.local', '881771015', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('3396ef60-8acd-4b7c-b14e-114480c6c522', '8b2d6dc7-5853-4014-b163-38e527b4e523', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('9df6ab95-137b-4a05-807d-85d936278712', 'student43@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('9df6ab95-137b-4a05-807d-85d936278712', '11111111-1111-1111-1111-111111111111', 'Qosimova   Odinaxon  Mashrabovna', 'student43@app.local', '916067814', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('72cf4278-d415-4462-a7f8-167246970aab', '9df6ab95-137b-4a05-807d-85d936278712', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('a162c185-0fdf-48df-99c9-4b12d91f0a5b', 'student44@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('a162c185-0fdf-48df-99c9-4b12d91f0a5b', '11111111-1111-1111-1111-111111111111', 'Quchqarov   Jasurbek  Maxammadjonovich', 'student44@app.local', '994400803', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('2eac6986-e5bd-47a1-bdb1-deacd4d46b49', 'a162c185-0fdf-48df-99c9-4b12d91f0a5b', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('15e625f4-26b5-410e-916a-3de689c6f143', 'student45@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('15e625f4-26b5-410e-916a-3de689c6f143', '11111111-1111-1111-1111-111111111111', 'Raximova   Marg''uba  Kenjabayevna', 'student45@app.local', '996013266', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('1982543b-2e50-449b-a982-138fb2f6f9d4', '15e625f4-26b5-410e-916a-3de689c6f143', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('1c1bf8a8-7433-4232-b9dc-8ef0aa87ce4d', 'student46@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('1c1bf8a8-7433-4232-b9dc-8ef0aa87ce4d', '11111111-1111-1111-1111-111111111111', 'Sultonov  Qodirjon  Xasanboyevich', 'student46@app.local', '999034547', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('0c10fa07-f4fb-40f6-9f4f-b05030ff22f0', '1c1bf8a8-7433-4232-b9dc-8ef0aa87ce4d', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('4cef06ad-7912-4d7c-a5d2-b20768829c74', 'student47@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('4cef06ad-7912-4d7c-a5d2-b20768829c74', '11111111-1111-1111-1111-111111111111', 'Usmanov   Ilhamdjan   Komiljanovich', 'student47@app.local', '997958714', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('da5f4abf-384f-4247-ad25-6bbf74fdce45', '4cef06ad-7912-4d7c-a5d2-b20768829c74', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('e5fd187d-a03c-45e5-bc81-649d51c163b5', 'student48@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('e5fd187d-a03c-45e5-bc81-649d51c163b5', '11111111-1111-1111-1111-111111111111', 'Xabibidinov  Rustamjon  Xxx', 'student48@app.local', '936906606', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('34363d41-d4c5-46c7-bdf8-aa4b1b131eb1', 'e5fd187d-a03c-45e5-bc81-649d51c163b5', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('f1e8e604-64f0-410d-b438-99b1e386f2b3', 'student49@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('f1e8e604-64f0-410d-b438-99b1e386f2b3', '11111111-1111-1111-1111-111111111111', 'Mamajonova  Feruza   Kozimjon qizi', 'student49@app.local', '994338407', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('5d574a7b-592c-4f89-969a-8bf5f2a1cd77', 'f1e8e604-64f0-410d-b438-99b1e386f2b3', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('314b0b16-9aaa-49a1-95bf-c975ee9c0522', 'student50@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('314b0b16-9aaa-49a1-95bf-c975ee9c0522', '11111111-1111-1111-1111-111111111111', 'Shoqosimov  Baxrom  Kaxramonovich', 'student50@app.local', '999037043', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('aefa7c10-a0ce-441c-b680-d339d53d2edd', '314b0b16-9aaa-49a1-95bf-c975ee9c0522', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('48c54f73-ac8c-49a5-9965-29f96a165b21', 'student51@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('48c54f73-ac8c-49a5-9965-29f96a165b21', '11111111-1111-1111-1111-111111111111', 'Mirzamahmudov  Abrorbek  Azimjonovich', 'student51@app.local', '945620181', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('4abc421f-585c-4ad1-908c-ccd2249706b0', '48c54f73-ac8c-49a5-9965-29f96a165b21', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('af2dcce2-f496-478e-b7b6-6eb3b70a5aa8', 'student52@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('af2dcce2-f496-478e-b7b6-6eb3b70a5aa8', '11111111-1111-1111-1111-111111111111', 'Oripov  Abbosbek Baxtiyorovich', 'student52@app.local', '999089118', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('7c6830fa-1eff-488d-aaef-0f60ca1b6e37', 'af2dcce2-f496-478e-b7b6-6eb3b70a5aa8', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('91ac56b4-497a-4c7d-8859-381c1be6fbbd', 'student53@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('91ac56b4-497a-4c7d-8859-381c1be6fbbd', '11111111-1111-1111-1111-111111111111', 'Jo''rayev Bekzod Ramazonovich', 'student53@app.local', '905133848', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('60fec297-4178-48d5-bf4b-536967d5a4fc', '91ac56b4-497a-4c7d-8859-381c1be6fbbd', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('7bc5e3d3-bab9-4467-90e0-547889d90b28', 'student54@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('7bc5e3d3-bab9-4467-90e0-547889d90b28', '11111111-1111-1111-1111-111111111111', 'Haydarov Salim Halimovich', 'student54@app.local', '946288458', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('57a7dd47-ba39-4c0b-980b-b32d1f44f3d6', '7bc5e3d3-bab9-4467-90e0-547889d90b28', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('7a0f6204-60da-4c49-815b-b88e8e8b2d59', 'student55@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('7a0f6204-60da-4c49-815b-b88e8e8b2d59', '11111111-1111-1111-1111-111111111111', 'Mavlonova  Mohigul Obidovna', 'student55@app.local', '934595800', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('6b61e567-039f-4ea1-b5ee-1e9fc0a8e1a1', '7a0f6204-60da-4c49-815b-b88e8e8b2d59', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('5be42f9b-5ee9-4833-aab0-2a480b0aa24f', 'student56@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('5be42f9b-5ee9-4833-aab0-2a480b0aa24f', '11111111-1111-1111-1111-111111111111', 'Saydullayev Ruslan Shomurodovich', 'student56@app.local', '912412340', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('4516b400-7500-49cd-a852-8fdd69a61a20', '5be42f9b-5ee9-4833-aab0-2a480b0aa24f', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('e1b1a51b-6a96-42a1-9369-2367727a7078', 'student57@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('e1b1a51b-6a96-42a1-9369-2367727a7078', '11111111-1111-1111-1111-111111111111', 'Xolmamatova Saltanat Maftunquli', 'student57@app.local', '990762888', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('cba4689a-6a82-41f6-b1a7-83884705a66b', 'e1b1a51b-6a96-42a1-9369-2367727a7078', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('9db87ebc-7f54-43ff-af3c-d478bd573871', 'student58@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('9db87ebc-7f54-43ff-af3c-d478bd573871', '11111111-1111-1111-1111-111111111111', 'Botirjonova Umida Ural qizi', 'student58@app.local', '995932531', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('c23559a3-52ef-43f2-b0a6-c8cd0b34b5e1', '9db87ebc-7f54-43ff-af3c-d478bd573871', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('356f3d45-d00d-4bc9-b0d3-af3f365579d4', 'student59@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('356f3d45-d00d-4bc9-b0d3-af3f365579d4', '11111111-1111-1111-1111-111111111111', 'Ibotova Gulnoza Usmonqul', 'student59@app.local', '993550449', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('2f08fd79-698b-45c8-aa9f-1fcb27540381', '356f3d45-d00d-4bc9-b0d3-af3f365579d4', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('945cff41-61d0-4597-a8ac-305ebb4b0b0e', 'student60@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('945cff41-61d0-4597-a8ac-305ebb4b0b0e', '11111111-1111-1111-1111-111111111111', 'Dexkanov Baxridin Ibragimovich', 'student60@app.local', '990704238', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('e4641540-3858-4eab-b9ec-91a72f01e1a5', '945cff41-61d0-4597-a8ac-305ebb4b0b0e', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('9e129f5b-bdeb-4db7-a757-11fd98bec718', 'student61@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('9e129f5b-bdeb-4db7-a757-11fd98bec718', '11111111-1111-1111-1111-111111111111', 'Xakimov G''olibjon Alijonovich', 'student61@app.local', '934481004', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('7041d47e-53cc-467a-a0a7-ab516ced0653', '9e129f5b-bdeb-4db7-a757-11fd98bec718', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('365edcc5-ac22-41a3-80e9-825df68dc923', 'student62@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('365edcc5-ac22-41a3-80e9-825df68dc923', '11111111-1111-1111-1111-111111111111', 'Zakirov Bekzod Shokirjanovich', 'student62@app.local', '941760510', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('0e5a1901-5cbf-4fce-9e25-cd4c46aa7508', '365edcc5-ac22-41a3-80e9-825df68dc923', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('4ed69b9b-09b3-4fae-a0ae-06132d69af18', 'student63@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('4ed69b9b-09b3-4fae-a0ae-06132d69af18', '11111111-1111-1111-1111-111111111111', 'Yuldashev Baxtiyor Ruzmamatovich', 'student63@app.local', '950124580', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('4bf6a2b5-4102-4e10-9fc4-fedccdc1b982', '4ed69b9b-09b3-4fae-a0ae-06132d69af18', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('a9fc3ead-3e36-481c-8b9b-426672731d12', 'student64@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('a9fc3ead-3e36-481c-8b9b-426672731d12', '11111111-1111-1111-1111-111111111111', 'Alimova  Barchinoy Raxmonjonovna', 'student64@app.local', '942701820', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('45630c89-91a9-4294-af82-070805833bd6', 'a9fc3ead-3e36-481c-8b9b-426672731d12', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('c4fa6985-f29b-4e3a-9c15-f6f7949e84c3', 'student65@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('c4fa6985-f29b-4e3a-9c15-f6f7949e84c3', '11111111-1111-1111-1111-111111111111', 'Axmadalieva Muazzam Rasuljon qizi', 'student65@app.local', '990700116', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('80fa62d6-87da-4b68-9bf8-669897def3da', 'c4fa6985-f29b-4e3a-9c15-f6f7949e84c3', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('22c39b8e-e89e-4e8a-8493-5d860389c2a2', 'student66@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('22c39b8e-e89e-4e8a-8493-5d860389c2a2', '11111111-1111-1111-1111-111111111111', 'Raximberdiev Anvarjon Tursunbaevich', 'student66@app.local', '941783416', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('d58edbf7-08cf-4f56-a970-c85d86e2340c', '22c39b8e-e89e-4e8a-8493-5d860389c2a2', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('248a99af-a364-487e-9d5a-16c1ea8a73d6', 'student67@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('248a99af-a364-487e-9d5a-16c1ea8a73d6', '11111111-1111-1111-1111-111111111111', 'Kasimov Zafarjon Zokirjanovich', 'student67@app.local', '996110389', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('f824a38e-d1e8-4f04-99ca-2f83d74b5041', '248a99af-a364-487e-9d5a-16c1ea8a73d6', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('1377f578-aa6d-4ce9-8a89-cb4444764ca4', 'student68@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('1377f578-aa6d-4ce9-8a89-cb4444764ca4', '11111111-1111-1111-1111-111111111111', 'Fayziyeva Sanobar Xayriddinovna', 'student68@app.local', '94-484-44-66', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('c7d21686-ccda-48a7-9f29-ee102bbe1a80', '1377f578-aa6d-4ce9-8a89-cb4444764ca4', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('e4d3888a-febb-495c-bde0-a6b5a839c26c', 'student69@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('e4d3888a-febb-495c-bde0-a6b5a839c26c', '11111111-1111-1111-1111-111111111111', 'Mirzayev Nurali Norqo''ziyevich', 'student69@app.local', '94-377-04-68', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('46175362-235c-455c-a7bf-fcb0d7be3fe6', 'e4d3888a-febb-495c-bde0-a6b5a839c26c', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('9aa3d05d-423d-4fc3-9dd2-6bfb50b7f0fe', 'student70@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('9aa3d05d-423d-4fc3-9dd2-6bfb50b7f0fe', '11111111-1111-1111-1111-111111111111', 'Umarov Farhod Faxriddinovich', 'student70@app.local', '99-420-29-87', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('71f8d5bd-5b4a-4f4a-85ac-ca1a823accdd', '9aa3d05d-423d-4fc3-9dd2-6bfb50b7f0fe', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('02d9314c-2d52-4a40-aad4-0e97867bd2bb', 'student71@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('02d9314c-2d52-4a40-aad4-0e97867bd2bb', '11111111-1111-1111-1111-111111111111', 'Abdimuminov  Amir Xamza o''g''li', 'student71@app.local', '977591151', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('95c02dd1-23e5-4191-976e-b384c4c8de8a', '02d9314c-2d52-4a40-aad4-0e97867bd2bb', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('8be0f1f7-0e3a-4492-9eed-1486f38a695a', 'student72@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('8be0f1f7-0e3a-4492-9eed-1486f38a695a', '11111111-1111-1111-1111-111111111111', 'Babaqulov  Nodir Djabbarovich', 'student72@app.local', '906097167', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('ee99366f-d566-4828-93b6-b11ea311ae11', '8be0f1f7-0e3a-4492-9eed-1486f38a695a', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('a426d512-5bc7-47b5-8fdf-f528ea00a74e', 'student73@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('a426d512-5bc7-47b5-8fdf-f528ea00a74e', '11111111-1111-1111-1111-111111111111', 'Mamadiyev Javohir Abdunavi o''g''li', 'student73@app.local', '912190906', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('debf564f-0103-46bf-9ff9-929762310bb4', 'a426d512-5bc7-47b5-8fdf-f528ea00a74e', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('a51044b8-a8d4-4cbe-a11a-ee15f20f9d1b', 'student74@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('a51044b8-a8d4-4cbe-a11a-ee15f20f9d1b', '11111111-1111-1111-1111-111111111111', 'Mashrapova  Gulbar Askarovna', 'student74@app.local', '973189425', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('994638e5-ef34-41b9-8fd4-e4a9102b0921', 'a51044b8-a8d4-4cbe-a11a-ee15f20f9d1b', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('67ca2a57-98ee-4b2b-9209-a81a1f33b381', 'student75@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('67ca2a57-98ee-4b2b-9209-a81a1f33b381', '11111111-1111-1111-1111-111111111111', 'Nurboboyev  Xumoyunbek Tolmas o''g''li', 'student75@app.local', '997310446', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('c61530f3-d15b-46b2-975b-de0ac388d636', '67ca2a57-98ee-4b2b-9209-a81a1f33b381', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('935aab10-9ea0-4930-8759-c4ca4bf68d9e', 'student76@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('935aab10-9ea0-4930-8759-c4ca4bf68d9e', '11111111-1111-1111-1111-111111111111', 'Omonov Anvar Isamovich', 'student76@app.local', '973802879', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('d2246ef3-fa90-4679-b3ea-acfbd56c7d52', '935aab10-9ea0-4930-8759-c4ca4bf68d9e', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('73656ff4-2456-455f-97ac-7b3170b200a1', 'student77@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('73656ff4-2456-455f-97ac-7b3170b200a1', '11111111-1111-1111-1111-111111111111', 'Pulatov  Maxmadali Abdirayimovich', 'student77@app.local', '943353163', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('077f7449-1e4c-4a06-8ba7-c0a2d56028e9', '73656ff4-2456-455f-97ac-7b3170b200a1', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('c594b739-3071-46cd-9c78-6e40cddec2c3', 'student78@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('c594b739-3071-46cd-9c78-6e40cddec2c3', '11111111-1111-1111-1111-111111111111', 'Sharifova  Feruza Djurayevna', 'student78@app.local', '936379445', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('6f9f0c61-94b2-47d1-97cc-61029548af84', 'c594b739-3071-46cd-9c78-6e40cddec2c3', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('37a49948-0ef5-41fb-811d-692e6ced337d', 'student79@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('37a49948-0ef5-41fb-811d-692e6ced337d', '11111111-1111-1111-1111-111111111111', 'Hatamova  Aziza Ochildiyevna', 'student79@app.local', '997466661', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('0f6e9c73-8f9d-4d57-bcba-57f919ed84d1', '37a49948-0ef5-41fb-811d-692e6ced337d', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('eb4d0d8e-74cb-41b4-b887-62ddee6433ea', 'student80@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('eb4d0d8e-74cb-41b4-b887-62ddee6433ea', '11111111-1111-1111-1111-111111111111', 'Jahongirova  Dilafro''z Faxriddinovna', 'student80@app.local', '995907902', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('df7a56d4-2117-4d23-bfd4-5edeacab540c', 'eb4d0d8e-74cb-41b4-b887-62ddee6433ea', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('2fdc82ef-8215-43f4-a130-9883d654ac1c', 'student81@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('2fdc82ef-8215-43f4-a130-9883d654ac1c', '11111111-1111-1111-1111-111111111111', 'Abubakirov Abduqaxxor Abdumajid o''gli', 'student81@app.local', '998176388', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('a0d505c1-46c4-49ca-986a-db938e62d94d', '2fdc82ef-8215-43f4-a130-9883d654ac1c', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('5432c22d-18df-4e29-ac8d-6dca1367d275', 'student82@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('5432c22d-18df-4e29-ac8d-6dca1367d275', '11111111-1111-1111-1111-111111111111', 'O''rinov Rustam Xoliqul o''g''li', 'student82@app.local', '943976898', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('e95f7722-427b-4c2d-a86a-e0fe89313b76', '5432c22d-18df-4e29-ac8d-6dca1367d275', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('4a3ea1ad-1362-4564-abec-4fe6494cc9a9', 'student83@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('4a3ea1ad-1362-4564-abec-4fe6494cc9a9', '11111111-1111-1111-1111-111111111111', 'Niyozova  Gulnoza Baxtiyor qizi', 'student83@app.local', '994746792', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('86e0b615-220a-4f6b-a992-c54f0f55f734', '4a3ea1ad-1362-4564-abec-4fe6494cc9a9', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('ad7cb645-0060-4d0e-bc63-13c8369ab53f', 'student84@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('ad7cb645-0060-4d0e-bc63-13c8369ab53f', '11111111-1111-1111-1111-111111111111', 'Abramov  Jamshid Erkinovich', 'student84@app.local', '943500707', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('6bcdd718-33f4-492b-952f-6cf5760f8206', 'ad7cb645-0060-4d0e-bc63-13c8369ab53f', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('61d6d297-8146-4515-8c85-9da04c6e35c7', 'student85@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('61d6d297-8146-4515-8c85-9da04c6e35c7', '11111111-1111-1111-1111-111111111111', 'Kushbekova  Yulduz  Barakayevna', 'student85@app.local', '882459292', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('afae9c5a-68b5-43fb-92eb-a5f31307990d', '61d6d297-8146-4515-8c85-9da04c6e35c7', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('e91d46c9-59b7-445f-a286-869a2d1502b5', 'student86@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('e91d46c9-59b7-445f-a286-869a2d1502b5', '11111111-1111-1111-1111-111111111111', 'Bo''riboyeva Dilrabo Norboy qizi', 'student86@app.local', '994713128', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('b0b47c33-849c-4f4f-a4dc-fd85179c1e65', 'e91d46c9-59b7-445f-a286-869a2d1502b5', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('e597be32-5d49-4b16-a079-b4adf1bc86fd', 'student87@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('e597be32-5d49-4b16-a079-b4adf1bc86fd', '11111111-1111-1111-1111-111111111111', 'Farmonov Baxtiyor Xaitboyevich', 'student87@app.local', '999884481', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('411b93c7-bf2c-42e5-9856-d88c78ce7e94', 'e597be32-5d49-4b16-a079-b4adf1bc86fd', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('1be6bef9-6d63-48a7-91c3-0dde8cc0793b', 'student88@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('1be6bef9-6d63-48a7-91c3-0dde8cc0793b', '11111111-1111-1111-1111-111111111111', 'Raxmonberdiyev Toxirjon Kamoliddinovich', 'student88@app.local', '916249988', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('333e90d7-4569-476c-acc9-6780967ec693', '1be6bef9-6d63-48a7-91c3-0dde8cc0793b', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('b5c8033f-8c75-4e52-abf5-a71019a7e2d4', 'student89@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('b5c8033f-8c75-4e52-abf5-a71019a7e2d4', '11111111-1111-1111-1111-111111111111', 'Urunov   Xurshid  Zokirovich', 'student89@app.local', '998220526', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('bddb60a4-0729-477b-b7eb-e959c92b2203', 'b5c8033f-8c75-4e52-abf5-a71019a7e2d4', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('c8176e36-4108-49fc-9167-e0ca44091971', 'student90@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('c8176e36-4108-49fc-9167-e0ca44091971', '11111111-1111-1111-1111-111111111111', 'Qobilova   Hamida Axtamovna', 'student90@app.local', '997126807', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('4d42bf3b-7396-4a0d-a2ab-ce70ec405b8b', 'c8176e36-4108-49fc-9167-e0ca44091971', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('566ff8c1-a69f-4217-895c-01eda925fef6', 'student91@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('566ff8c1-a69f-4217-895c-01eda925fef6', '11111111-1111-1111-1111-111111111111', 'Nazarova  Gulsanam   Abdimuratovna', 'student91@app.local', '938878990', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('07882e6c-7250-4679-a3bc-ee673a7dc1d2', '566ff8c1-a69f-4217-895c-01eda925fef6', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('3e03811e-f63e-4960-a1a7-7658adac2c6c', 'student92@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('3e03811e-f63e-4960-a1a7-7658adac2c6c', '11111111-1111-1111-1111-111111111111', 'Ubaydullayeva   Yulduz   Yakubjonovna', 'student92@app.local', '901005159', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('b3f71d84-9614-4622-aa8a-7c800352f09c', '3e03811e-f63e-4960-a1a7-7658adac2c6c', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('bcad25a6-ac71-42d5-b5a7-ec1d52440a2a', 'student93@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('bcad25a6-ac71-42d5-b5a7-ec1d52440a2a', '11111111-1111-1111-1111-111111111111', 'Kaxorov   Murod   Ergashevich', 'student93@app.local', '974051679', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('60c7074a-da25-4a80-a779-66c259fe09ae', 'bcad25a6-ac71-42d5-b5a7-ec1d52440a2a', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('ec302e06-5588-4051-a4a1-33bb45b5861b', 'student94@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('ec302e06-5588-4051-a4a1-33bb45b5861b', '11111111-1111-1111-1111-111111111111', 'Nazarova   Munisa  Yusupovna', 'student94@app.local', '902846172', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('24c34125-a5a9-4e6d-a669-7ef23d5f49f9', 'ec302e06-5588-4051-a4a1-33bb45b5861b', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('752e55a2-209b-4057-adb3-a9c6ab0d766b', 'student95@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('752e55a2-209b-4057-adb3-a9c6ab0d766b', '11111111-1111-1111-1111-111111111111', 'Egamberdiyev  Isomiddin   Umirovich', 'student95@app.local', '999454530', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('c7603571-0f26-4f76-bf33-49528e73841b', '752e55a2-209b-4057-adb3-a9c6ab0d766b', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('ea462e3a-164f-450a-b9f8-3e0a418d7c62', 'student96@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('ea462e3a-164f-450a-b9f8-3e0a418d7c62', '11111111-1111-1111-1111-111111111111', 'Murotov  Elyor   Eslamasovich', 'student96@app.local', '942883099', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('23373439-c21e-4e9a-b3d1-27f09d955041', 'ea462e3a-164f-450a-b9f8-3e0a418d7c62', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('1406ba9d-d3ea-4770-ae9f-0f04773a52a5', 'student97@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('1406ba9d-d3ea-4770-ae9f-0f04773a52a5', '11111111-1111-1111-1111-111111111111', 'Taganov  Xurmatbek Ravshonbekovish', 'student97@app.local', '904387003', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('3292a530-bd44-4d9e-8bfe-88602ed0784d', '1406ba9d-d3ea-4770-ae9f-0f04773a52a5', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('05fa99af-c30d-43d8-83c7-88ec98b152a4', 'student98@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('05fa99af-c30d-43d8-83c7-88ec98b152a4', '11111111-1111-1111-1111-111111111111', 'Bekchanova Umida Kurbanbayevna', 'student98@app.local', '943182678', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('3014945e-cb5a-4f23-abca-9e39c6067f7a', '05fa99af-c30d-43d8-83c7-88ec98b152a4', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('d1d3af05-e053-4221-9ee9-a665d95be4f2', 'student99@app.local', crypt('Student123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, phone, role) VALUES ('d1d3af05-e053-4221-9ee9-a665d95be4f2', '11111111-1111-1111-1111-111111111111', 'Yermatova Xadicha Kuryazovna', 'student99@app.local', '907372056', 'student');
INSERT INTO public.students (id, user_id, group_id, status) VALUES ('0dea96af-e6b0-4675-91bb-f0cdb865dcc5', 'd1d3af05-e053-4221-9ee9-a665d95be4f2', '7eeef45b-b4cd-497f-8f26-5ec0fb26b8a5', 'active');


-- Tutors (Mas'ul xodimlar)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('5c301f6e-9c70-4495-a4a1-9fd556eec0d6', 'otabek@app.local', crypt('otabek12', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('5c301f6e-9c70-4495-a4a1-9fd556eec0d6', '11111111-1111-1111-1111-111111111111', 'Otabek', 'otabek@app.local', 'tutor');
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) VALUES ('c86de69e-466f-4f76-860f-15719402d271', 'guldona@app.local', crypt('Guldona12', gen_salt('bf')), now(), 'authenticated', 'authenticated', now(), now());
INSERT INTO public.users (id, organization_id, full_name, email, role) VALUES ('c86de69e-466f-4f76-860f-15719402d271', '11111111-1111-1111-1111-111111111111', 'Guldona', 'guldona@app.local', 'tutor');

-- Admin parolini yangilash (Xusniddin!123 ga)
UPDATE auth.users SET encrypted_password = crypt('Xusniddin!123', gen_salt('bf')) WHERE email = 'admin@itacademy.uz';
