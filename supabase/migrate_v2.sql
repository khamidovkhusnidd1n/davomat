-- ============================================================================
-- DAVOMAT v2.0 MIGRATION — TO'G'RILANGAN
-- Barcha bog'liq RLS polisalarni avval olib tashlaydi, so'ng o'zgartiradi
-- Supabase SQL Editor'da to'liq run qiling
-- ============================================================================

-- ============================================================================
-- QADAM 1: Bog'liq bo'lgan BARCHA eski RLS polisalarini o'chirish
-- ============================================================================

-- groups polisalari
DROP POLICY IF EXISTS "org_read_groups" ON public.groups;
DROP POLICY IF EXISTS "admin_insert_groups" ON public.groups;
DROP POLICY IF EXISTS "admin_update_groups" ON public.groups;
DROP POLICY IF EXISTS "admin_delete_groups" ON public.groups;

-- students polisalari
DROP POLICY IF EXISTS "read_students" ON public.students;
DROP POLICY IF EXISTS "admin_insert_students" ON public.students;
DROP POLICY IF EXISTS "admin_update_students" ON public.students;
DROP POLICY IF EXISTS "admin_delete_students" ON public.students;

-- lessons polisalari
DROP POLICY IF EXISTS "read_lessons" ON public.lessons;
DROP POLICY IF EXISTS "admin_insert_lessons" ON public.lessons;
DROP POLICY IF EXISTS "insert_lessons" ON public.lessons;
DROP POLICY IF EXISTS "admin_update_lessons" ON public.lessons;
DROP POLICY IF EXISTS "admin_delete_lessons" ON public.lessons;
DROP POLICY IF EXISTS "write_insert_lessons" ON public.lessons;
DROP POLICY IF EXISTS "write_update_lessons" ON public.lessons;
DROP POLICY IF EXISTS "write_delete_lessons" ON public.lessons;

-- attendance polisalari
DROP POLICY IF EXISTS "read_attendance" ON public.attendance;
DROP POLICY IF EXISTS "admin_insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "teacher_insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "admin_update_attendance" ON public.attendance;
DROP POLICY IF EXISTS "teacher_update_attendance" ON public.attendance;
DROP POLICY IF EXISTS "update_attendance" ON public.attendance;
DROP POLICY IF EXISTS "nazoratchi_insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "nazoratchi_update_attendance" ON public.attendance;

-- schedules polisalari
DROP POLICY IF EXISTS "org_read_schedules" ON public.schedules;
DROP POLICY IF EXISTS "read_schedules" ON public.schedules;
DROP POLICY IF EXISTS "admin_insert_schedules" ON public.schedules;
DROP POLICY IF EXISTS "admin_update_schedules" ON public.schedules;
DROP POLICY IF EXISTS "admin_delete_schedules" ON public.schedules;
DROP POLICY IF EXISTS "write_insert_schedules" ON public.schedules;
DROP POLICY IF EXISTS "write_update_schedules" ON public.schedules;
DROP POLICY IF EXISTS "write_delete_schedules" ON public.schedules;

-- subjects polisalari (oldingi yarim run dan qolgan bo'lishi mumkin)
DROP POLICY IF EXISTS "read_subjects" ON public.subjects;
DROP POLICY IF EXISTS "write_subjects" ON public.subjects;

-- teachers polisalari
DROP POLICY IF EXISTS "read_teachers" ON public.teachers;
DROP POLICY IF EXISTS "write_teachers" ON public.teachers;

-- teacher_subjects polisalari
DROP POLICY IF EXISTS "read_teacher_subjects" ON public.teacher_subjects;
DROP POLICY IF EXISTS "write_teacher_subjects" ON public.teacher_subjects;


-- ============================================================================
-- QADAM 2: users.role CHECK — nazoratchi qo'shish
-- ============================================================================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE public.users SET role = 'nazoratchi' WHERE role IN ('teacher', 'tutor');

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'sysadmin', 'academic', 'director', 'nazoratchi', 'student', 'monitor'));


-- ============================================================================
-- QADAM 3: groups jadvalini yangilash
-- ============================================================================

-- education_type qo'shish
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS education_type TEXT NOT NULL DEFAULT 'qayta_tayyorlov';

ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_education_type_check;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_education_type_check
  CHECK (education_type IN ('malaka_oshirish', 'qayta_tayyorlov'));

-- teacher_id → nazoratchi_id rename
ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_teacher_id_fkey;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE public.groups RENAME COLUMN teacher_id TO nazoratchi_id;
  END IF;
END $$;

ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_nazoratchi_id_fkey;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_nazoratchi_id_fkey
  FOREIGN KEY (nazoratchi_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- tutor_id ustunini olib tashlash
ALTER TABLE public.groups DROP COLUMN IF EXISTS tutor_id;


-- ============================================================================
-- QADAM 4: subjects — Fanlar jadvali (YANGI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subjects_name_org_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_subjects_org_id ON public.subjects(organization_id);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- QADAM 5: teachers — O'qituvchilar jadvali (YANGI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teachers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  education_type  TEXT NOT NULL DEFAULT 'qayta_tayyorlov',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teachers_name_org_unique UNIQUE (organization_id, full_name),
  CONSTRAINT teachers_education_type_check
    CHECK (education_type IN ('malaka_oshirish', 'qayta_tayyorlov'))
);

CREATE INDEX IF NOT EXISTS idx_teachers_org_id ON public.teachers(organization_id);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- QADAM 6: teacher_subjects — O'qituvchi-Fan-Soat (YANGI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id      UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  allocated_hours INTEGER NOT NULL DEFAULT 0,
  academic_year   TEXT NOT NULL DEFAULT '2025-2026',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_subjects_unique UNIQUE (teacher_id, subject_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON public.teacher_subjects(teacher_id);
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- QADAM 7: schedules — yangi maydonlar
-- ============================================================================
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;


-- ============================================================================
-- QADAM 8: lessons — yangi maydonlar
-- ============================================================================
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS start_time TIME;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS end_time TIME;


-- ============================================================================
-- QADAM 9: BARCHA RLS POLISALARINI QAYTA YARATISH
-- ============================================================================

-- ---- GROUPS ----
CREATE POLICY "org_read_groups"
  ON public.groups FOR SELECT TO authenticated
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "admin_insert_groups"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_organization_id()
    AND public.get_my_role() IN ('admin', 'sysadmin', 'academic')
  );

CREATE POLICY "admin_update_groups"
  ON public.groups FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_organization_id()
    AND public.get_my_role() IN ('admin', 'sysadmin', 'academic')
  )
  WITH CHECK (
    organization_id = public.get_my_organization_id()
    AND public.get_my_role() IN ('admin', 'sysadmin', 'academic')
  );

CREATE POLICY "admin_delete_groups"
  ON public.groups FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_organization_id()
    AND public.get_my_role() IN ('admin', 'sysadmin', 'academic')
  );

-- ---- SUBJECTS ----
CREATE POLICY "read_subjects"
  ON public.subjects FOR SELECT TO authenticated
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "write_subjects"
  ON public.subjects FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));

-- ---- TEACHERS ----
CREATE POLICY "read_teachers"
  ON public.teachers FOR SELECT TO authenticated
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "write_teachers"
  ON public.teachers FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));

-- ---- TEACHER_SUBJECTS ----
CREATE POLICY "read_teacher_subjects"
  ON public.teacher_subjects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_subjects.teacher_id
        AND t.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_teacher_subjects"
  ON public.teacher_subjects FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));

-- ---- SCHEDULES ----
CREATE POLICY "read_schedules"
  ON public.schedules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedules.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_insert_schedules"
  ON public.schedules FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedules.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_update_schedules"
  ON public.schedules FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedules.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  )
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedules.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_delete_schedules"
  ON public.schedules FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedules.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

-- ---- STUDENTS ----
CREATE POLICY "read_students"
  ON public.students FOR SELECT TO authenticated
  USING (
    CASE
      WHEN public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'director') THEN
        EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = students.group_id
            AND g.organization_id = public.get_my_organization_id()
        )
      WHEN public.get_my_role() IN ('nazoratchi', 'monitor') THEN
        EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = students.group_id
            AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid())
        )
      WHEN public.get_my_role() = 'student' THEN
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.group_id = students.group_id AND s.user_id = auth.uid()
        )
      ELSE false
    END
  );

CREATE POLICY "admin_insert_students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = students.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "admin_update_students"
  ON public.students FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = students.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  )
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = students.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "admin_delete_students"
  ON public.students FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = students.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

-- ---- LESSONS ----
CREATE POLICY "read_lessons"
  ON public.lessons FOR SELECT TO authenticated
  USING (
    CASE
      WHEN public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'director') THEN
        EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = lessons.group_id
            AND g.organization_id = public.get_my_organization_id()
        )
      WHEN public.get_my_role() IN ('nazoratchi', 'monitor') THEN
        EXISTS (
          SELECT 1 FROM public.groups g
          WHERE g.id = lessons.group_id
            AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid())
        )
      WHEN public.get_my_role() = 'student' THEN
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.group_id = lessons.group_id AND s.user_id = auth.uid()
        )
      ELSE false
    END
  );

CREATE POLICY "write_insert_lessons"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = lessons.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_update_lessons"
  ON public.lessons FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = lessons.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  )
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = lessons.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_delete_lessons"
  ON public.lessons FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = lessons.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

-- ---- ATTENDANCE ----
CREATE POLICY "read_attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    CASE
      WHEN public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'director') THEN
        EXISTS (
          SELECT 1 FROM public.lessons l
          JOIN public.groups g ON g.id = l.group_id
          WHERE l.id = attendance.lesson_id
            AND g.organization_id = public.get_my_organization_id()
        )
      WHEN public.get_my_role() IN ('nazoratchi', 'monitor') THEN
        EXISTS (
          SELECT 1 FROM public.lessons l
          JOIN public.groups g ON g.id = l.group_id
          WHERE l.id = attendance.lesson_id
            AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid())
        )
      WHEN public.get_my_role() = 'student' THEN
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = attendance.student_id AND s.user_id = auth.uid()
        )
      ELSE false
    END
  );

CREATE POLICY "admin_insert_attendance"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "nazoratchi_insert_attendance"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('nazoratchi', 'monitor')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
        AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid())
        AND l.lesson_date >= CURRENT_DATE - INTERVAL '2 days'
    )
  );

CREATE POLICY "admin_update_attendance"
  ON public.attendance FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
        AND g.organization_id = public.get_my_organization_id()
    )
  )
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "nazoratchi_update_attendance"
  ON public.attendance FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('nazoratchi', 'monitor')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
        AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid())
        AND l.lesson_date >= CURRENT_DATE - INTERVAL '2 days'
    )
  );

-- ============================================================================
-- TUGADI ✅
-- ============================================================================
SELECT 'Migration v2.0 muvaffaqiyatli bajarildi!' AS result;
