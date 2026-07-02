# DAVOMAD - Tizimning Texnik Topshirig'i (TZ) va Holati

Ushbu hujjat "DAVOMAD" o'quv markazlari va ta'lim muassasalari uchun mo'ljallangan davomatni hisobga olish tizimining joriy holatini va arxitekturasini tavsiflaydi.

## 1. Tizimning Umumiy Tavsifi
**Loyiha nomi:** DAVOMAD
**Maqsadi:** O'qituvchilar, tyutorlar va sinf sardorlari uchun talabalar davomatini elektron tarzda, tez va qulay belgilash, shuningdek, administratorlar uchun jarayonni to'liq nazorat qilish imkonini beruvchi yagona platforma.

Tizim uchta asosiy qismdan iborat:
1. **Ma'lumotlar bazasi va Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
2. **Veb-sayt (Admin Panel):** Next.js (React) asosida yozilgan, administratorlar uchun boshqaruv paneli.
3. **Mobil ilova (APK):** Flutter asosida yozilgan, o'qituvchilar va sinf sardorlari uchun mo'ljallangan davomat belgilash ilovasi.

---

## 2. Texnologik Stek (Stack)

- **Backend / Database:** Supabase (PostgreSQL 15+)
- **Autentifikatsiya:** Supabase Auth (Email / Password)
- **Web Frontend:** Next.js 14+ (App Router), React, Vanilla CSS (CSS Modules), Lucide React (ikonkalar), XLSX (Excel bilan ishlash).
- **Mobile Frontend:** Flutter 3.x, Supabase Flutter, GoRouter, Google Fonts, Hive (Local DB).
- **Hosting / CI/CD:** GitHub Actions (APK yig'ish uchun), Vercel (Web hosting uchun mo'ljallangan).

---

## 3. Ma'lumotlar Bazasi Strukturasi (Schema)

Tizim quyidagi asosiy jadvallardan (tables) tashkil topgan:

1. **`users`** - Barcha foydalanuvchilar (Admin, Tyutor, Student/Monitor).
   - `id` (UUID), `role` (admin/tutor/student), `full_name`, `email`, `created_at`.
2. **`organizations`** - Tashkilotlar yoki filiallar.
3. **`courses`** - Yo'nalishlar / Kurslar.
4. **`groups`** - Guruhlar. Bitta guruh bitta kursga tegishli bo'ladi.
   - O'zida `tutor_id` va `monitor_id` ni saqlaydi.
5. **`students`** - Talabalar ro'yxati va ularning guruhga bog'lanishi.
   - `student_id` (users jadvaliga bog'langan), `group_id`, `parent_phone`.
6. **`schedules`** - Dars jadvallari (Haftalik).
   - `group_id`, `day_of_week` (1-7), `start_time`, `end_time`.
7. **`lessons`** - Aniq bir kundagi o'tilgan (yoki o'tiladigan) darslar.
   - `group_id`, `lesson_date`, `title`.
8. **`attendance`** - Davomat yozuvlari.
   - `lesson_id`, `student_id`, `status` (present, absent, late, excused), `notes`.

---

## 4. Web Admin Panel Imkoniyatlari

Admin panel `http://localhost:3000` orqali ishlaydi va quyidagi sahifa va imkoniyatlarga ega:

- **Autentifikatsiya:** Admin login va parol orqali tizimga kiradi (`admin` logini avtomatik tarzda `@app.local` domeniga aylantiriladi).
- **Bosh sahifa (Dashboard):** Tizimdagi jami tashkilotlar, kurslar, guruhlar, talabalar va o'qituvchilar sonini ko'rsatuvchi statistika va grafiklar.
- **Tashkilotlar:** Yangi tashkilot/filial qo'shish, tahrirlash va o'chirish.
- **Kurslar:** Kurslarni (yo'nalishlarni) boshqarish.
- **Guruhlar:** Guruh yaratish, unga Tyutor (O'qituvchi) va Monitor (Sinf sardori) tayinlash.
- **Tyutorlar:** Tizimga o'qituvchilarni qo'shish (Parol kiritilmasa avtomatik `123456` beriladi).
- **O'quvchilar:** Talabalarni qo'shish, guruhga biriktirish, ota-ona raqamini kiritish.
- **Jadvallar (Schedules):** 
  - Guruhlar uchun haftalik dars jadvalini shakllantirish.
  - **Aqlli Excel Import (Smart Parser):** Insonlar uchun mo'ljallangan murakkab Excel (merged cells, kirill yozuvidagi kunlar: "Душанба", "9-00." kabi vaqt formatlari) fayllarni tizim o'zi tushunib, to'g'ridan-to'g'ri bazaga yozib qoya oladi.
- **Davomat:** Barcha guruhlar kesimida qilingan davomatlar tarixini ko'rish.

---

## 5. Mobil Ilova Imkoniyatlari

Mobil ilova Tyutorlar va Sinf sardorlari uchun mo'ljallangan:

- **Login:** Oddiy login orqali kirish (masalan `xamidov` va `123456`). Ilova orqa fonda email formatiga o'tkazib API ga murojaat qiladi.
- **Bosh sahifa (Home):**
  - Tizimga kirgan foydalanuvchining (Tyutor yoki Sardor) o'ziga biriktirilgan guruhlarni aniqlaydi.
  - **Bugungi Darslar:** Haftaning joriy kuniga mos keladigan jadvallarni (schedules) topib, ekranda chiroyli UI da (zamonaviy kartalar, soyalar, Google Fonts) ko'rsatib beradi.
- **Davomat belgilash (Attendance):**
  - Dars ustiga bosilganda tizim shu sana uchun `lessons` jadvalida yozuv bor-yo'qligini tekshiradi. Agar yo'q bo'lsa, avtomatik yaratadi.
  - O'sha guruhdagi barcha talabalar ro'yxatini chiqaradi.
  - Foydalanuvchi har bir talaba uchun: "Keldi", "Kelmadi", "Kech qoldi", "Sababli" maqomlaridan birini tanlaydi.
  - "Saqlash" tugmasi orqali ma'lumotlar to'g'ridan-to'g'ri Supabase dagi `attendance` jadvaliga yoziladi.

---

## 6. Xavfsizlik va RLS (Row Level Security)

Hozirgi holatda ma'lumotlar bazasida RLS (Row Level Security) siyosatlari qo'llanilgan, ya'ni tizimdagi ma'lumotlarni faqatgina avtorizatsiyadan o'tgan (authenticated) foydalanuvchilar o'qishi yoki yozishi mumkin. Keyingi bosqichlarda har bir tashkilot o'zining ma'lumotini ko'rishi uchun qattiqroq RLS siyosatlari joriy qilinishi mumkin.

---

## 7. Keyingi Rivojlantirish Rejalari (Roadmap)
- Davomat olinmagan darslar uchun bildirishnomalar (Push Notifications).
- Ota-onalarga farzandi darsga kelmaganida SMS yoki Telegram bot orqali avtomatik xabar yuborish.
- Oflayn ish rejimini to'liq sinovdan o'tkazish va ma'lumotlarni sinxronizatsiya qilish (Hive -> Supabase).
- Hisobotlarni (Reports) Excel yoki PDF formatida yuklab olish.
