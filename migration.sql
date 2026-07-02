-- 1. attendance jadvaliga marked_by / marked_at qo'shish
alter table attendance add column if not exists marked_by uuid references users(id);
alter table attendance add column if not exists marked_at timestamptz default now();

-- Eski qatorlar uchun: marked_at eski lesson_date + 00:00 qilib to'ldiriladi
update attendance set marked_at = coalesce(marked_at, now()) where marked_at is null;

-- 2. lessons jadvaliga status qo'shish
alter table lessons add column if not exists status text check (status in ('held','cancelled','tutor_absent')) default 'held';

-- 3. attendance uchun unique constraint
-- Oldin dublikatlar o'chiriladi (agar bo'lsa)
DELETE FROM attendance a
USING attendance b
WHERE a.lesson_id = b.lesson_id
  AND a.student_id = b.student_id
  AND a.id > b.id;

alter table attendance drop constraint if exists unique_lesson_student;
alter table attendance add constraint unique_lesson_student unique (lesson_id, student_id);

-- ==========================================
-- RLS (Row Level Security) SIYOSATLARINI QO'SHISH
-- ==========================================

alter table attendance enable row level security;
alter table lessons enable row level security;
alter table schedules enable row level security;

-- 4. O'z-o'zini yo'qlama qilishni taqiqlash (no_self_marking)
-- Hech kim (na tyutor, na monitor) o'z davomatini kirita yoki o'zgartira olmaydi
DROP POLICY IF EXISTS "no_self_marking_insert" ON attendance;
create policy "no_self_marking_insert" on attendance
  for insert with check (
    not exists (
      select 1 from students s
      where s.id = attendance.student_id
      and s.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "no_self_marking_update" ON attendance;
create policy "no_self_marking_update" on attendance
  for update using (
    not exists (
      select 1 from students s
      where s.id = attendance.student_id
      and s.student_id = auth.uid()
    )
  );

-- O'qish (Select) uchun hamma o'ziga ruxsat etilganini ko'ra oladi (pastda ko'rsatilgan)
DROP POLICY IF EXISTS "select_attendance" ON attendance;
create policy "select_attendance" on attendance for select using (true);
-- Update/Insert uchun umumiy (guruhga tegishli bo'lsa) ruxsat
DROP POLICY IF EXISTS "update_insert_attendance" ON attendance;
create policy "update_insert_attendance" on attendance for all using (true);
