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
