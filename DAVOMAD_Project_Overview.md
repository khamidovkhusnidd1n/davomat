# 📋 DAVOMAD - Attendance Management System
## Project Overview & Organization

---

## 📌 Project Summary

**Project Name:** DAVOMAD (Davomatni Hisobga Olish Tizimi)  
**Purpose:** Electronic attendance tracking system for educational organizations  
**Status:** Active Development  
**Repository:** GitHub (Private)

### Core Components:
1. **Backend/Database:** Supabase (PostgreSQL + Auth + RLS)
2. **Web Admin Panel:** Next.js + React
3. **Mobile App:** Flutter (Teacher & Monitor app)

---

## 🏗️ Technology Stack

| Component | Technology |
|-----------|-----------|
| **Database** | Supabase (PostgreSQL 15+) |
| **Authentication** | Supabase Auth (Email/Password) |
| **Backend** | Node.js/API (Supabase) |
| **Web Frontend** | Next.js 14+, React, CSS Modules |
| **Mobile Frontend** | Flutter 3.x, GoRouter |
| **UI Components** | Lucide React Icons, Google Fonts |
| **Data Storage** | Hive (Local), PostgreSQL (Cloud) |
| **Hosting** | Vercel (Web), GitHub Actions (APK Build) |
| **Libraries** | XLSX (Excel), Supabase SDK |

---

## 📂 Project Structure

```
davomat_loyiha/
├── admin/                      # Next.js Web Admin Panel
│   ├── app/                   # Next.js App Router
│   ├── components/            # React Components
│   ├── pages/                 # Admin Dashboard Pages
│   └── public/                # Static Assets
├── teacher_app/               # Flutter Mobile Application
│   ├── lib/                   # Flutter Source Code
│   ├── android/               # Android-specific config
│   ├── ios/                   # iOS-specific config
│   └── pubspec.yaml           # Flutter dependencies
├── supabase/                  # Database Configuration
│   ├── migrations/            # SQL migrations
│   └── functions/             # Edge functions
├── .github/                   # GitHub CI/CD
│   └── workflows/             # GitHub Actions
├── Documentation/
│   ├── TZ.md                  # Technical Requirements (Uzbek)
│   ├── DAVOMAD_MVP_Architecture.md
│   └── DAVOMAD_Admin_Dashboard_MVP.md
└── Database Scripts/
    ├── migration.sql          # Initial schema
    ├── fix_rls.sql           # RLS policies
    └── drop_constraint.sql   # Database fixes
```

---

## 💾 Database Schema (PostgreSQL)

### Core Tables:

1. **users** - All system users
   - id (UUID), role, full_name, email, created_at
   - Roles: admin, tutor, student, monitor

2. **organizations** - Educational centers/branches
   - Name, address, contact info

3. **courses** - Course/Program directions
   - Course name, description

4. **groups** - Student groups
   - group_id, course_id, tutor_id, monitor_id
   - Links to tutors and monitors

5. **students** - Student records
   - student_id (user), group_id, parent_phone
   - Linked to specific groups

6. **schedules** - Weekly class schedule
   - group_id, day_of_week (1-7), start_time, end_time

7. **lessons** - Specific lesson instances
   - group_id, lesson_date, title, created_by

8. **attendance** - Attendance records
   - lesson_id, student_id, status (present/absent/late/excused)
   - notes, recorded_by

---

## 🌐 Web Admin Panel Features

**Access:** `http://localhost:3000`

### Pages & Functionality:

✅ **Dashboard** - Statistics & Analytics
- Total organizations, courses, groups, students, tutors

✅ **Authentication** - Admin Login
- Automatic email format conversion (admin → admin@app.local)

✅ **Organizations** - Manage branches
- Create, Edit, Delete

✅ **Courses** - Program management
- Add/Remove courses

✅ **Groups** - Manage student groups
- Assign tutors and monitors

✅ **Tutors/Teachers** - User management
- Add tutors (auto password: 123456)
- Manage permissions

✅ **Students** - Student records
- Add students to groups
- Parent contact management

✅ **Schedules** - Class scheduling
- **Smart Excel Import:** Auto-parses complex Excel files
- Handles merged cells, Cyrillic day names, custom time formats
- Direct database insertion

✅ **Attendance History** - View records
- Filter by group, date range
- Export capabilities (planned)

---

## 📱 Mobile App Features (Flutter)

### User Roles:
- **Tutors** (Teachers)
- **Monitors** (Class Leaders/Seniors)

### Core Functionality:

🔐 **Login**
- Username & password (e.g., "xamidov" + "123456")
- Auto-converts to email format for API

📊 **Home Screen**
- Shows assigned groups for current user
- Today's schedule with card-based UI
- Modern design with shadows & Google Fonts

✍️ **Attendance Recording**
- Tap lesson to open attendance
- Auto-creates lesson record if missing
- List all students in group
- Mark attendance: Present, Absent, Late, Excused
- Save directly to Supabase

📱 **Offline Support**
- Hive local database
- Sync when connection returns

---

## 🔐 Security Implementation

### Current:
- **RLS (Row Level Security)** enabled
- Authentication required for all data access
- Basic role-based access control

### Future:
- Multi-tenant data isolation
- Organization-level data access policies
- Enhanced permission system

---

## 🚀 CI/CD & Deployment

### Web (Admin Panel):
- **Host:** Vercel
- **Build:** Next.js built-in
- **Deployment:** Auto on GitHub push

### Mobile (Flutter APK):
- **CI/CD:** GitHub Actions
- **Build:** Automated APK compilation
- **Distribution:** Released via GitHub

### Database:
- **Platform:** Supabase
- **Version Control:** SQL migrations in `/supabase`
- **Backup:** Supabase automated backup

---

## 📋 Development Roadmap

### Phase 1 (Current ✓)
- ✅ Basic CRUD operations
- ✅ Attendance recording
- ✅ Admin dashboard

### Phase 2 (Planned 🔜)
- 📲 Push notifications for missed classes
- 🤖 Automated parent SMS/Telegram alerts
- 📊 Advanced reporting (Excel/PDF export)
- 🔄 Complete offline-first sync

### Phase 3 (Future)
- 📈 Advanced analytics
- 📧 Email parent communications
- 🎓 Grade integration
- 🌍 Multi-language support

---

## 🛠️ Development Setup

### Prerequisites:
```bash
# Web
- Node.js 18+
- npm/yarn

# Mobile
- Flutter 3.x SDK
- Android SDK / Xcode

# Database
- Supabase account
```

### Quick Start:
```bash
# Web Admin
cd admin
npm install
npm run dev

# Mobile App
cd teacher_app
flutter pub get
flutter run

# Database
- Use Supabase CLI to apply migrations
```

---

## 📝 File References

| File | Purpose |
|------|---------|
| TZ.md | Complete technical requirements (Uzbek) |
| DAVOMAD_MVP_Architecture.md | System architecture |
| DAVOMAD_Admin_Dashboard_MVP.md | Admin UI specifications |
| migration.sql | Initial database schema |
| fix_rls.sql | Row Level Security policies |
| github_ga_yuklash.bat | GitHub Actions setup |

---

## 👥 Team Information

**System Users:**
- **Admins** - System administrators managing everything
- **Tutors** - Teachers recording attendance
- **Monitors** - Class leaders assisting
- **Students** - Attendance records tracked

---

## 📧 Contact & Support

For technical questions about DAVOMAD system architecture and implementation, refer to:
- Technical Requirements: `TZ.md`
- Architecture Docs: `DAVOMAD_MVP_Architecture.md`
- Admin Panel Specs: `DAVOMAD_Admin_Dashboard_MVP.md`

---

**Last Updated:** July 3, 2026  
**Version:** 1.0 - MVP Release
