-- ============================================================
-- RLS POLICIES UPDATE: sysadmin, admin, director, academic
-- ============================================================
-- Barcha eski policy-larni o'chirib, yangilarini yaratamiz
-- sysadmin = to'liq huquq (admin bilan bir xil)
-- admin = to'liq huquq
-- director = faqat o'qish (read-only)
-- academic = darslar, davomat, jadvallar uchun to'liq huquq
-- ============================================================

-- ===================== GROUPS =====================

-- READ: barcha admin rollar ko'ra oladi
DROP POLICY IF EXISTS org_read_groups ON groups;
CREATE POLICY org_read_groups ON groups FOR SELECT USING (
  (get_my_role() IN ('sysadmin', 'admin', 'director', 'academic') AND organization_id = get_my_organization_id())
  OR
  (get_my_role() IN ('teacher', 'tutor', 'monitor') AND (teacher_id = auth.uid() OR tutor_id = auth.uid() OR monitor_id = auth.uid()))
);

-- INSERT
DROP POLICY IF EXISTS admin_insert_groups ON groups;
CREATE POLICY admin_insert_groups ON groups FOR INSERT WITH CHECK (
  get_my_role() IN ('sysadmin', 'admin') AND organization_id = get_my_organization_id()
);

-- UPDATE
DROP POLICY IF EXISTS admin_update_groups ON groups;
CREATE POLICY admin_update_groups ON groups FOR UPDATE USING (
  get_my_role() IN ('sysadmin', 'admin') AND organization_id = get_my_organization_id()
) WITH CHECK (
  get_my_role() IN ('sysadmin', 'admin') AND organization_id = get_my_organization_id()
);

-- DELETE
DROP POLICY IF EXISTS admin_delete_groups ON groups;
CREATE POLICY admin_delete_groups ON groups FOR DELETE USING (
  get_my_role() IN ('sysadmin', 'admin') AND organization_id = get_my_organization_id()
);

-- ===================== STUDENTS =====================

-- READ
DROP POLICY IF EXISTS read_students ON students;
CREATE POLICY read_students ON students FOR SELECT USING (
  CASE
    WHEN get_my_role() IN ('sysadmin', 'admin', 'director', 'academic') THEN
      EXISTS (SELECT 1 FROM groups g WHERE g.id = students.group_id AND g.organization_id = get_my_organization_id())
    WHEN get_my_role() IN ('teacher', 'tutor', 'monitor') THEN
      EXISTS (SELECT 1 FROM groups g WHERE g.id = students.group_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()))
    ELSE false
  END
);

-- INSERT
DROP POLICY IF EXISTS admin_insert_students ON students;
CREATE POLICY admin_insert_students ON students FOR INSERT WITH CHECK (
  get_my_role() IN ('sysadmin', 'admin') AND
  EXISTS (SELECT 1 FROM groups g WHERE g.id = students.group_id AND g.organization_id = get_my_organization_id())
);

-- UPDATE
DROP POLICY IF EXISTS admin_update_students ON students;
CREATE POLICY admin_update_students ON students FOR UPDATE USING (
  get_my_role() IN ('sysadmin', 'admin') AND
  EXISTS (SELECT 1 FROM groups g WHERE g.id = students.group_id AND g.organization_id = get_my_organization_id())
) WITH CHECK (
  get_my_role() IN ('sysadmin', 'admin') AND
  EXISTS (SELECT 1 FROM groups g WHERE g.id = students.group_id AND g.organization_id = get_my_organization_id())
);

-- DELETE
DROP POLICY IF EXISTS admin_delete_students ON students;
CREATE POLICY admin_delete_students ON students FOR DELETE USING (
  get_my_role() IN ('sysadmin', 'admin') AND
  EXISTS (SELECT 1 FROM groups g WHERE g.id = students.group_id AND g.organization_id = get_my_organization_id())
);

-- ===================== LESSONS =====================

-- READ
DROP POLICY IF EXISTS read_lessons ON lessons;
CREATE POLICY read_lessons ON lessons FOR SELECT USING (
  CASE
    WHEN get_my_role() IN ('sysadmin', 'admin', 'director', 'academic') THEN
      EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND g.organization_id = get_my_organization_id())
    WHEN get_my_role() IN ('teacher', 'tutor', 'monitor') THEN
      EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()))
    ELSE false
  END
);

-- INSERT (admin + academic + teachers)
DROP POLICY IF EXISTS insert_lessons ON lessons;
DROP POLICY IF EXISTS admin_insert_lessons ON lessons;
CREATE POLICY insert_lessons ON lessons FOR INSERT WITH CHECK (
  (get_my_role() IN ('sysadmin', 'admin', 'academic') AND
    EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND g.organization_id = get_my_organization_id()))
  OR
  (get_my_role() IN ('teacher', 'tutor', 'monitor') AND
    EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())))
);

-- UPDATE
DROP POLICY IF EXISTS admin_update_lessons ON lessons;
CREATE POLICY admin_update_lessons ON lessons FOR UPDATE USING (
  (get_my_role() IN ('sysadmin', 'admin', 'academic') AND
    EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND g.organization_id = get_my_organization_id()))
  OR
  (get_my_role() IN ('teacher', 'tutor', 'monitor') AND
    EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())))
) WITH CHECK (
  (get_my_role() IN ('sysadmin', 'admin', 'academic') AND
    EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND g.organization_id = get_my_organization_id()))
  OR
  (get_my_role() IN ('teacher', 'tutor', 'monitor') AND
    EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid())))
);

-- DELETE
DROP POLICY IF EXISTS admin_delete_lessons ON lessons;
CREATE POLICY admin_delete_lessons ON lessons FOR DELETE USING (
  get_my_role() IN ('sysadmin', 'admin') AND
  EXISTS (SELECT 1 FROM groups g WHERE g.id = lessons.group_id AND g.organization_id = get_my_organization_id())
);

-- ===================== ATTENDANCE =====================

-- READ
DROP POLICY IF EXISTS read_attendance ON attendance;
CREATE POLICY read_attendance ON attendance FOR SELECT USING (
  CASE
    WHEN get_my_role() IN ('sysadmin', 'admin', 'director', 'academic') THEN
      EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = get_my_organization_id())
    WHEN get_my_role() IN ('teacher', 'tutor', 'monitor') THEN
      EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()))
    ELSE false
  END
);

-- INSERT
DROP POLICY IF EXISTS admin_insert_attendance ON attendance;
DROP POLICY IF EXISTS teacher_insert_attendance ON attendance;
CREATE POLICY insert_attendance ON attendance FOR INSERT WITH CHECK (
  (get_my_role() IN ('sysadmin', 'admin', 'academic') AND
    EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = get_my_organization_id()))
  OR
  (get_my_role() IN ('teacher', 'tutor', 'monitor') AND
    EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()) AND l.lesson_date >= CURRENT_DATE - INTERVAL '1 day'))
);

-- UPDATE
DROP POLICY IF EXISTS admin_update_attendance ON attendance;
DROP POLICY IF EXISTS teacher_update_attendance ON attendance;
CREATE POLICY update_attendance ON attendance FOR UPDATE USING (
  (get_my_role() IN ('sysadmin', 'admin', 'academic') AND
    EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = get_my_organization_id()))
  OR
  (get_my_role() IN ('teacher', 'tutor', 'monitor') AND
    EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()) AND l.lesson_date >= CURRENT_DATE - INTERVAL '1 day'))
) WITH CHECK (
  (get_my_role() IN ('sysadmin', 'admin', 'academic') AND
    EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = get_my_organization_id()))
  OR
  (get_my_role() IN ('teacher', 'tutor', 'monitor') AND
    EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND (g.teacher_id = auth.uid() OR g.tutor_id = auth.uid() OR g.monitor_id = auth.uid()) AND l.lesson_date >= CURRENT_DATE - INTERVAL '1 day'))
);

-- DELETE
DROP POLICY IF EXISTS admin_delete_attendance ON attendance;
CREATE POLICY admin_delete_attendance ON attendance FOR DELETE USING (
  get_my_role() IN ('sysadmin', 'admin') AND
  EXISTS (SELECT 1 FROM lessons l JOIN groups g ON g.id = l.group_id WHERE l.id = attendance.lesson_id AND g.organization_id = get_my_organization_id())
);
