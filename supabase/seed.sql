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
     'IT Academy Toshkent',
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

    -- Teacher 1
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
     '11111111-1111-1111-1111-111111111111',
     'Raxmatullayev Sardor Anvarovich',
     'teacher1@itacademy.uz',
     '+998 90 200 00 01',
     'teacher'),

    -- Teacher 2
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
     '11111111-1111-1111-1111-111111111111',
     'Tursunova Nilufar Shavkatovna',
     'teacher2@itacademy.uz',
     '+998 90 200 00 02',
     'teacher'),

    -- Students 01-10
    ('dddddddd-dddd-dddd-dddd-dddddddddd01', '11111111-1111-1111-1111-111111111111',
     'Abdullayev Bobur Kamolovich', 'student01@itacademy.uz', '+998 90 300 00 01', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd02', '11111111-1111-1111-1111-111111111111',
     'Mahmudova Dildora Rustamovna', 'student02@itacademy.uz', '+998 90 300 00 02', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd03', '11111111-1111-1111-1111-111111111111',
     'Xasanov Sherzod Ulug''bekovich', 'student03@itacademy.uz', '+998 90 300 00 03', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd04', '11111111-1111-1111-1111-111111111111',
     'Ergasheva Madina Faxriddinovna', 'student04@itacademy.uz', '+998 90 300 00 04', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd05', '11111111-1111-1111-1111-111111111111',
     'Normatov Javohir Abdurashidovich', 'student05@itacademy.uz', '+998 90 300 00 05', 'student'),
    ('dddddddd-dddd-dddd-dddd-dddddddddd06', '11111111-1111-1111-1111-111111111111',
     'Qobilov Otabek Muzaffarovich', 'student06@itacademy.uz', '+998 90 300 00 06', 'student'),
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
INSERT INTO public.groups (id, organization_id, teacher_id, name, course_name) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccc01',
     '11111111-1111-1111-1111-111111111111',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
     'PY-101',
     'Python Backend'),

    ('cccccccc-cccc-cccc-cccc-cccccccccc02',
     '11111111-1111-1111-1111-111111111111',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
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
--   Admin:    admin@itacademy.uz     / Admin123!
--   Teacher1: teacher1@itacademy.uz  / Teacher123!
--   Teacher2: teacher2@itacademy.uz  / Teacher123!
-- ============================================================================
