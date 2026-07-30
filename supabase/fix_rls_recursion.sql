-- Drop the recursive read_students policy
DROP POLICY IF EXISTS "read_students" ON public.students;

-- Recreate it without recursion for the student role
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
        students.user_id = auth.uid()
      ELSE false
    END
  );

SELECT 'RLS recursion fixed!' AS result;
