# DAVOMAD - Attendance Management System (MVP)

## Overview

DAVOMAD is a simple attendance management application designed for
training centers, schools, and educational organizations.

### Technology Stack

  Layer                      Technology
  -------------------------- ----------------------
  Mobile (O'qituvchi)        Flutter (faqat Android)
  Web (Admin Panel)          Next.js (React)
  Backend                    Supabase (Free Plan)
  Database                   PostgreSQL
  State Management           Riverpod (Mobile)
  Hosting (Web)              O'z serverida
  Til                        O'zbek tili
  Tema                       Dark mode + Light mode

------------------------------------------------------------------------

# User Roles

## Admin (Faqat Web orqali, APK emas)

-   Manage organization
-   Create groups (yakkalik yoki Excel `.xls` fayli orqali)
-   Add teachers (yakkalik yoki Excel `.xls` fayli orqali)
-   Add students (yakkalik yoki Excel `.xls` fayli orqali)
-   Haftalik jadval belgilash (kunlar + vaqt)
-   View reports and statistics
-   Login/parol yaratib tarqatadi (o'qituvchilarga)

## Teacher (Faqat Android ilovasi)

-   View assigned group (1 o'qituvchi = 1 guruh)
-   Avtomatik yaratilgan darslar ro'yxatini ko'rish
-   Mark attendance (shu kuni belgilash + 24 soat ichida tahrirlash)
-   View attendance history

## Student (Tizimga kirmaydi)

-   MVP-da talaba ilovaga kirmaydi
-   Faqat o'qituvchi va admin talaba davomatini boshqaradi

------------------------------------------------------------------------

# Database Schema

## organizations

``` text
id
name
phone
address
created_at
```

## users

``` text
id
organization_id
full_name
email
phone
role
created_at
```

Roles:

``` text
admin
teacher
student
```

## groups

``` text
id
organization_id
teacher_id          -- 1 o'qituvchi = 1 guruh (UNIQUE)
name
course_name
created_at
```

## schedules (YANGI)

Admin belgilaydigan haftalik jadval. Darslar avtomatik yaratiladi.

``` text
id
group_id
day_of_week         -- 1=Dush, 2=Sesh, ..., 6=Shan
start_time          -- 14:00
end_time            -- 15:30
created_at
```

## students

``` text
id
user_id
group_id
joined_at
status
```

## lessons

Jadval asosida avtomatik yaratiladi. O'qituvchi yaratmaydi.

``` text
id
group_id
title
lesson_date
created_by          -- system / admin
created_at
```

## attendance

``` text
id
lesson_id
student_id
status
marked_by
created_at
```

Status:

``` text
present
absent
late
```

------------------------------------------------------------------------

# Attendance Flow

``` text
Teacher opens today's lesson
        ↓
Student list appears
        ↓
Ali      ✅ Present
Vali     ❌ Absent
Hasan    ✅ Present
Jasur    ⏰ Late
        ↓
Save Attendance
```

No QR Code.

No GPS.

No Camera.

### Davomat vaqt cheklovi

-   O'qituvchi: faqat shu kuni belgilaydi + 24 soat ichida tahrirlashi mumkin
-   Admin: istalgan vaqtda o'zgartira oladi

------------------------------------------------------------------------

# Dashboards

## Admin (Web Panel)

-   Total Students
-   Total Teachers
-   Total Groups
-   Today's Lessons
-   Attendance Rate

## Teacher

-   My Groups
-   Today's Lessons
-   Attendance History

## Student

-   Personal Attendance
-   Attendance Percentage

------------------------------------------------------------------------

# REST API

``` text
POST /login

GET  /groups
POST /groups

GET  /students
POST /students

GET  /lessons
POST /lessons

GET  /attendance
POST /attendance
```

------------------------------------------------------------------------

# Reports

-   Daily Attendance
-   Monthly Attendance
-   Student Report
-   Group Report

## Export

-   PDF
-   Excel

------------------------------------------------------------------------

# Future Features

-   QR Code Attendance
-   Face Recognition
-   Push Notifications
-   Parent SMS
-   Excel Export
-   Offline Synchronization

------------------------------------------------------------------------

# MVP Principles

-   Simple
-   Fast
-   Easy to Use
-   Easy to Maintain
-   Ready for Future Scaling

------------------------------------------------------------------------

# Loyiha Zaif Nuqtalari (Weak Points)

-   **Offline ishlash yo'qligi:** Tarmoq o'chsa, davomat to'xtaydi. Flutter local kesh (Hive/Isar) zarur.
-   **Tashkilot aralashishi:** Supabase RLS `organization_id` bo'yicha sozlanmasa, ma'lumotlar boshqa tashkilotlarga sizib chiqishi xavfi bor.
-   **Onboarding qiyinligi:** Admin barcha foydalanuvchilarni qo'lda qo'shishi og'ir. Guruh kodi yoki taklif havolasi kerak.
-   **Tarix buzilishi:** O'quvchi guruhdan ketsa yoki boshqasiga o'tsa, eski davomat tarixi o'chib ketadi. Soft delete yoki a'zolik tarixi saqlanishi kerak.
-   **Cheklov yo'qligi:** O'qituvchi o'tgan oydagi yoki kelajakdagi darsga davomat yozishi mumkin. Vaqt limiti (masalan, 24 soat) zarur.
