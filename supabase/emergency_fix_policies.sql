-- ============================================================================
-- FAVQULODDA TUZATISH — Faqat RLS polisalarni qayta yaratish
-- Supabase SQL Editor'da HOZIR ishlatish
-- ============================================================================

-- Barcha mavjud polisalarni tozalash (xavfsiz)
DROP POLICY IF EXISTS "org_read_groups" ON public.groups;
DROP POLICY IF EXISTS "admin_insert_groups" ON public.groups;
DROP POLICY IF EXISTS "admin_update_groups" ON public.groups;
DROP POLICY IF EXISTS "admin_delete_groups" ON public.groups;
DROP POLICY IF EXISTS "read_students" ON public.students;
DROP POLICY IF EXISTS "admin_insert_students" ON public.students;
DROP POLICY IF EXISTS "admin_update_students" ON public.students;
DROP POLICY IF EXISTS "admin_delete_students" ON public.students;
DROP POLICY IF EXISTS "read_lessons" ON public.lessons;
DROP POLICY IF EXISTS "write_insert_lessons" ON public.lessons;
DROP POLICY IF EXISTS "write_update_lessons" ON public.lessons;
DROP POLICY IF EXISTS "write_delete_lessons" ON public.lessons;
DROP POLICY IF EXISTS "admin_insert_lessons" ON public.lessons;
DROP POLICY IF EXISTS "admin_update_lessons" ON public.lessons;
DROP POLICY IF EXISTS "admin_delete_lessons" ON public.lessons;
DROP POLICY IF EXISTS "insert_lessons" ON public.lessons;
DROP POLICY IF EXISTS "read_attendance" ON public.attendance;
DROP POLICY IF EXISTS "admin_insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "nazoratchi_insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "teacher_insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "insert_attendance" ON public.attendance;
DROP POLICY IF EXISTS "admin_update_attendance" ON public.attendance;
DROP POLICY IF EXISTS "nazoratchi_update_attendance" ON public.attendance;
DROP POLICY IF EXISTS "teacher_update_attendance" ON public.attendance;
DROP POLICY IF EXISTS "update_attendance" ON public.attendance;
DROP POLICY IF EXISTS "read_schedules" ON public.schedules;
DROP POLICY IF EXISTS "org_read_schedules" ON public.schedules;
DROP POLICY IF EXISTS "write_insert_schedules" ON public.schedules;
DROP POLICY IF EXISTS "write_update_schedules" ON public.schedules;
DROP POLICY IF EXISTS "write_delete_schedules" ON public.schedules;
DROP POLICY IF EXISTS "admin_insert_schedules" ON public.schedules;
DROP POLICY IF EXISTS "admin_update_schedules" ON public.schedules;
DROP POLICY IF EXISTS "admin_delete_schedules" ON public.schedules;
DROP POLICY IF EXISTS "read_subjects" ON public.subjects;
DROP POLICY IF EXISTS "write_subjects" ON public.subjects;
DROP POLICY IF EXISTS "read_teachers" ON public.teachers;
DROP POLICY IF EXISTS "write_teachers" ON public.teachers;
DROP POLICY IF EXISTS "read_teacher_subjects" ON public.teacher_subjects;
DROP POLICY IF EXISTS "write_teacher_subjects" ON public.teacher_subjects;

-- ============================================================================
-- GROUPS polisalari
-- ============================================================================
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
  USING (organization_id = public.get_my_organization_id()
    AND public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (organization_id = public.get_my_organization_id()
    AND public.get_my_role() IN ('admin', 'sysadmin', 'academic'));

CREATE POLICY "admin_delete_groups"
  ON public.groups FOR DELETE TO authenticated
  USING (organization_id = public.get_my_organization_id()
    AND public.get_my_role() IN ('admin', 'sysadmin', 'academic'));

-- ============================================================================
-- SCHEDULES polisalari
-- ============================================================================
CREATE POLICY "read_schedules"
  ON public.schedules FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id
      AND g.organization_id = public.get_my_organization_id())
  );

CREATE POLICY "write_insert_schedules"
  ON public.schedules FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id
      AND g.organization_id = public.get_my_organization_id())
  );

CREATE POLICY "write_update_schedules"
  ON public.schedules FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id
      AND g.organization_id = public.get_my_organization_id()))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id
      AND g.organization_id = public.get_my_organization_id()));

CREATE POLICY "write_delete_schedules"
  ON public.schedules FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = schedules.group_id
      AND g.organization_id = public.get_my_organization_id()));

-- ============================================================================
-- STUDENTS polisalari
-- ============================================================================
CREATE POLICY "read_students"
  ON public.students FOR SELECT TO authenticated
  USING (
    CASE
      WHEN public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'director') THEN
        EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id
          AND g.organization_id = public.get_my_organization_id())
      WHEN public.get_my_role() IN ('nazoratchi', 'monitor') THEN
        EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id
          AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid()))
      WHEN public.get_my_role() = 'student' THEN
        EXISTS (SELECT 1 FROM public.students s WHERE s.group_id = students.group_id AND s.user_id = auth.uid())
      ELSE false
    END
  );

CREATE POLICY "admin_insert_students"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id
      AND g.organization_id = public.get_my_organization_id())
  );

CREATE POLICY "admin_update_students"
  ON public.students FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id
      AND g.organization_id = public.get_my_organization_id()))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id
      AND g.organization_id = public.get_my_organization_id()));

CREATE POLICY "admin_delete_students"
  ON public.students FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = students.group_id
      AND g.organization_id = public.get_my_organization_id()));

-- ============================================================================
-- LESSONS polisalari
-- ============================================================================
CREATE POLICY "read_lessons"
  ON public.lessons FOR SELECT TO authenticated
  USING (
    CASE
      WHEN public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'director') THEN
        EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id
          AND g.organization_id = public.get_my_organization_id())
      WHEN public.get_my_role() IN ('nazoratchi', 'monitor') THEN
        EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id
          AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid()))
      WHEN public.get_my_role() = 'student' THEN
        EXISTS (SELECT 1 FROM public.students s WHERE s.group_id = lessons.group_id AND s.user_id = auth.uid())
      ELSE false
    END
  );

CREATE POLICY "write_insert_lessons"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id
      AND g.organization_id = public.get_my_organization_id())
  );

CREATE POLICY "write_update_lessons"
  ON public.lessons FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id
      AND g.organization_id = public.get_my_organization_id()))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'nazoratchi')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id
      AND g.organization_id = public.get_my_organization_id()));

CREATE POLICY "write_delete_lessons"
  ON public.lessons FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = lessons.group_id
      AND g.organization_id = public.get_my_organization_id()));

-- ============================================================================
-- ATTENDANCE polisalari
-- ============================================================================
CREATE POLICY "read_attendance"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    CASE
      WHEN public.get_my_role() IN ('admin', 'sysadmin', 'academic', 'director') THEN
        EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id
          WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id())
      WHEN public.get_my_role() IN ('nazoratchi', 'monitor') THEN
        EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id
          WHERE l.id = attendance.lesson_id
          AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid()))
      WHEN public.get_my_role() = 'student' THEN
        EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance.student_id AND s.user_id = auth.uid())
      ELSE false
    END
  );

CREATE POLICY "admin_insert_attendance"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id())
  );

CREATE POLICY "nazoratchi_insert_attendance"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('nazoratchi', 'monitor')
    AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
      AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid())
      AND l.lesson_date >= CURRENT_DATE - INTERVAL '2 days')
  );

CREATE POLICY "admin_update_attendance"
  ON public.attendance FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id()))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic')
    AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id AND g.organization_id = public.get_my_organization_id()));

CREATE POLICY "nazoratchi_update_attendance"
  ON public.attendance FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('nazoratchi', 'monitor')
    AND EXISTS (SELECT 1 FROM public.lessons l JOIN public.groups g ON g.id = l.group_id
      WHERE l.id = attendance.lesson_id
      AND (g.nazoratchi_id = auth.uid() OR g.monitor_id = auth.uid())
      AND l.lesson_date >= CURRENT_DATE - INTERVAL '2 days'));

-- ============================================================================
-- SUBJECTS polisalari
-- ============================================================================
CREATE POLICY "read_subjects"
  ON public.subjects FOR SELECT TO authenticated
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "write_subjects"
  ON public.subjects FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));

-- ============================================================================
-- TEACHERS polisalari
-- ============================================================================
CREATE POLICY "read_teachers"
  ON public.teachers FOR SELECT TO authenticated
  USING (organization_id = public.get_my_organization_id());

CREATE POLICY "write_teachers"
  ON public.teachers FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));

-- ============================================================================
-- TEACHER_SUBJECTS polisalari
-- ============================================================================
CREATE POLICY "read_teacher_subjects"
  ON public.teacher_subjects FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_subjects.teacher_id
      AND t.organization_id = public.get_my_organization_id())
  );

CREATE POLICY "write_teacher_subjects"
  ON public.teacher_subjects FOR ALL TO authenticated
  USING (public.get_my_role() IN ('admin', 'sysadmin', 'academic'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sysadmin', 'academic'));

-- ============================================================================
SELECT 'Favqulodda tuzatish muvaffaqiyatli!' AS result;
-- ============================================================================
