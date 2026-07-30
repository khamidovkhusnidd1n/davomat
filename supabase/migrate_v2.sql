-- ============================================================================
-- DAVOMAT v2.0 MIGRATION
-- Supabase SQL Editor'da to'liq run qiling
-- Backup tag: backup-before-v1.1-20260730-1631
-- ============================================================================

-- ============================================================================
-- 1. users.role CHECK — nazoratchi qo'shish, teacher saqlash (vaqtinchalik)
-- ============================================================================
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'sysadmin', 'academic', 'director', 'nazoratchi', 'teacher', 'student', 'monitor', 'tutor'));

-- Mavjud teacher rollarini nazoratchi ga o'zgartirish
UPDATE public.users SET role = 'nazoratchi' WHERE role = 'teacher';

-- Eski tutor rollarini nazoratchi ga o'zgartirish
UPDATE public.users SET role = 'nazoratchi' WHERE role = 'tutor';

-- Endi teacher va tutor ni CHECK dan olib tashlash
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'sysadmin', 'academic', 'director', 'nazoratchi', 'student', 'monitor'));


-- ============================================================================
-- 2. groups jadvaliga education_type qo'shish
-- ============================================================================
ALTER TABLE public.groups 
  ADD COLUMN IF NOT EXISTS education_type TEXT DEFAULT 'qayta_tayyorlov';

ALTER TABLE public.groups 
  ADD CONSTRAINT groups_education_type_check 
  CHECK (education_type IN ('malaka_oshirish', 'qayta_tayyorlov'));

-- groups.teacher_id → nazoratchi_id ga rename
-- (Avval foreign key ni olib tashlash kerak)
ALTER TABLE public.groups 
  DROP CONSTRAINT IF EXISTS groups_teacher_id_fkey;

ALTER TABLE public.groups 
  RENAME COLUMN teacher_id TO nazoratchi_id;

ALTER TABLE public.groups 
  ADD CONSTRAINT groups_nazoratchi_id_fkey 
  FOREIGN KEY (nazoratchi_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- tutor_id ni olib tashlash (artiq kerak emas)
ALTER TABLE public.groups DROP COLUMN IF EXISTS tutor_id;


-- ============================================================================
-- 3. subjects — Fanlar jadvali (YANGI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subjects_name_org_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_subjects_org_id ON public.subjects(organization_id);

-- RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_subjects"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "write_subjects"
  ON public.subjects FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));


-- ============================================================================
-- 4. teachers — O'qituvchilar jadvali (YANGI, users'dan alohida)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teachers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  education_type  TEXT NOT NULL DEFAULT 'qayta_tayyorlov',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teachers_education_type_check 
    CHECK (education_type IN ('malaka_oshirish', 'qayta_tayyorlov'))
);

CREATE INDEX IF NOT EXISTS idx_teachers_org_id ON public.teachers(organization_id);

-- RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_teachers"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "write_teachers"
  ON public.teachers FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));


-- ============================================================================
-- 5. teacher_subjects — O'qituvchi-Fan-Soat jadvali (YANGI)
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
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON public.teacher_subjects(subject_id);

-- RLS
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_teacher_subjects"
  ON public.teacher_subjects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_subjects.teacher_id
        AND t.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_teacher_subjects"
  ON public.teacher_subjects FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));


-- ============================================================================
-- 6. schedules — teacher_id (→ teachers) va subject_id qo'shish
-- ============================================================================
ALTER TABLE public.schedules 
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE public.schedules 
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;


-- ============================================================================
-- 7. lessons — yangi maydonlar qo'shish
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
-- 8. RLS polisalarini yangilash — nazoratchi rolini qo'shish
-- ============================================================================

-- SCHEDULES: read
DROP POLICY IF EXISTS "read_schedules" ON public.schedules;
CREATE POLICY "read_schedules"
  ON public.schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedules.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

-- SCHEDULES: write — admin, sysadmin, academic
DROP POLICY IF EXISTS "admin_insert_schedules" ON public.schedules;
DROP POLICY IF EXISTS "admin_update_schedules" ON public.schedules;
DROP POLICY IF EXISTS "admin_delete_schedules" ON public.schedules;

CREATE POLICY "write_insert_schedules"
  ON public.schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedules.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_update_schedules"
  ON public.schedules FOR UPDATE
  TO authenticated
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
  ON public.schedules FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = schedules.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

-- LESSONS: read — nazoratchi o'z guruhini ko'radi
DROP POLICY IF EXISTS "read_lessons" ON public.lessons;
CREATE POLICY "read_lessons"
  ON public.lessons FOR SELECT
  TO authenticated
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
          WHERE s.group_id = lessons.group_id
            AND s.user_id = auth.uid()
        )
      ELSE false
    END
  );

-- LESSONS: write — admin, sysadmin, academic, nazoratchi
DROP POLICY IF EXISTS "admin_insert_lessons" ON public.lessons;
DROP POLICY IF EXISTS "admin_update_lessons" ON public.lessons;
DROP POLICY IF EXISTS "admin_delete_lessons" ON public.lessons;

CREATE POLICY "write_insert_lessons"
  ON public.lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = lessons.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "write_update_lessons"
  ON public.lessons FOR UPDATE
  TO authenticated
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
  ON public.lessons FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (
      SELECT 1 FROM public.groups g
      WHERE g.id = lessons.group_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

-- ATTENDANCE: nazoratchi belgilash
DROP POLICY IF EXISTS "teacher_insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "teacher_update_attendance" ON public.attendance;

CREATE POLICY "nazoratchi_insert_attendance"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

CREATE POLICY "nazoratchi_update_attendance"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
        AND g.organization_id = public.get_my_organization_id()
    )
  );

-- ============================================================================
-- TUGADI ✅
-- ============================================================================
SELECT 'Migration v2.0 muvaffaqiyatli bajarildi!' AS result;
