-- ============================================
-- DAVOMAD: RLS SIYOSATLARINI TUZATISH
-- Ushbu SQL ni Supabase Dashboard > SQL Editor da bajaring
-- ============================================

-- 1. LESSONS jadvali: Authenticated userlar uchun to'liq ruxsat
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_lessons" ON lessons;
CREATE POLICY "authenticated_all_lessons" ON lessons
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. ATTENDANCE jadvali: Authenticated userlar uchun to'liq ruxsat
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_attendance" ON attendance;
CREATE POLICY "authenticated_all_attendance" ON attendance
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. SCHEDULES jadvali: Authenticated userlar uchun o'qish ruxsati
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_schedules" ON schedules;
CREATE POLICY "authenticated_all_schedules" ON schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. USERS jadvali: Authenticated userlar uchun o'qish ruxsati
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_users" ON users;
CREATE POLICY "authenticated_all_users" ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. STUDENTS jadvali
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_students" ON students;
CREATE POLICY "authenticated_all_students" ON students
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. GROUPS jadvali
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_all_groups" ON groups;
CREATE POLICY "authenticated_all_groups" ON groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tayyor! Endi ilovadan lessons va attendance ga yozish ishlaydi.
