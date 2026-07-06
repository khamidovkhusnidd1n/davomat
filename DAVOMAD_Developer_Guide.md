# 👨‍💻 DAVOMAD - Developer Quick Reference Guide

**Last Updated:** July 3, 2026  
**For:** Developers working on DAVOMAD system

---

## 🚀 Quick Start

### Prerequisites:
```bash
# Web Development
Node.js 18+, npm/yarn

# Mobile Development  
Flutter 3.x SDK
Android SDK (API 30+) or Xcode

# Database Access
Supabase account with project credentials
```

### Environment Setup:

```bash
# Clone repository
git clone <repo-url>
cd davomat_loyiha

# Web Admin Setup
cd admin
npm install
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
# Runs on http://localhost:3000

# Mobile App Setup
cd ../teacher_app
flutter pub get
flutter run -d emulator
# Or: flutter run -d <device-id>
```

---

## 📁 Project Structure Quick Guide

```
davomat_loyiha/
├── admin/                           # Next.js Web Admin Panel
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Dashboard
│   │   ├── login/page.tsx          # Auth page
│   │   ├── students/page.tsx       # Students management
│   │   ├── teachers/page.tsx       # Teachers management
│   │   ├── groups/page.tsx         # Groups management
│   │   ├── schedules/page.tsx      # Schedule management
│   │   ├── lessons/page.tsx        # Lessons page
│   │   └── attendance/page.tsx     # Attendance records
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   ├── forms/                  # Form components
│   │   ├── tables/                 # Data table components
│   │   └── dialogs/                # Modal dialogs
│   ├── lib/
│   │   ├── supabase/               # Supabase client setup
│   │   ├── utils/                  # Utility functions
│   │   ├── hooks/                  # Custom React hooks
│   │   └── types/                  # TypeScript types
│   ├── public/                     # Static assets, Excel templates
│   └── .env.local                  # Environment variables (git-ignored)
│
├── teacher_app/                     # Flutter Mobile App
│   ├── lib/
│   │   ├── main.dart               # App entry point
│   │   ├── screens/
│   │   │   ├── login/              # Login screen
│   │   │   ├── home/               # Home/Dashboard
│   │   │   ├── attendance/         # Attendance marking
│   │   │   ├── history/            # Attendance history
│   │   │   └── profile/            # User profile
│   │   ├── models/                 # Data models
│   │   ├── services/
│   │   │   ├── supabase_service.dart
│   │   │   ├── auth_service.dart
│   │   │   └── attendance_service.dart
│   │   ├── widgets/                # Custom widgets
│   │   └── utils/                  # Utilities & constants
│   ├── android/                    # Android config
│   ├── ios/                        # iOS config
│   ├── pubspec.yaml                # Flutter dependencies
│   └── analysis_options.yaml       # Linter config
│
├── supabase/
│   ├── migrations/                 # SQL migration files
│   └── functions/                  # Edge functions (if any)
│
├── .github/
│   └── workflows/                  # GitHub Actions CI/CD
│
├── TZ.md                           # Technical requirements (Uzbek)
├── DAVOMAD_MVP_Architecture.md    # Architecture overview
└── DAVOMAD_Admin_Dashboard_MVP.md # Admin panel specs
```

---

## 🔧 Common Development Tasks

### Adding a New Admin Page

**Example: New Reports Page**

1. **Create page component:**
   ```bash
   # app/reports/page.tsx
   ```

2. **Create related components:**
   ```bash
   # components/reports/ReportList.tsx
   # components/reports/ReportFilter.tsx
   # components/reports/ReportExport.tsx
   ```

3. **Add data fetching hooks:**
   ```bash
   # lib/hooks/useReports.ts
   ```

4. **Update sidebar menu:**
   ```tsx
   // components/ui/Sidebar.tsx
   { label: 'Reports', href: '/reports', icon: ChartBarIcon }
   ```

### Adding a New Mobile Screen

**Example: New Statistics Screen**

1. **Create screen:**
   ```bash
   # lib/screens/stats/stats_screen.dart
   ```

2. **Create models:**
   ```bash
   # lib/models/stats_model.dart
   ```

3. **Create service:**
   ```bash
   # lib/services/stats_service.dart
   ```

4. **Add navigation route:**
   ```dart
   // In GoRouter configuration
   GoRoute(path: '/stats', builder: (context, state) => StatsScreen())
   ```

### Database Migrations

**Create new migration:**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_new_table.sql
BEGIN;

CREATE TABLE new_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  column_name TYPE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" 
ON new_table FOR SELECT 
USING (auth.role() = 'authenticated');

COMMIT;
```

**Apply migration:**
```bash
# Using Supabase CLI
supabase db push
```

---

## 🗄️ Database Reference

### Key Tables at a Glance:

**users**
```sql
id (UUID), email, full_name, phone, role, organization_id, created_at
-- Roles: admin, tutor, student, monitor
```

**organizations**
```sql
id (UUID), name, phone, address, created_at
-- Top-level entity for data isolation
```

**groups**
```sql
id (UUID), organization_id, course_id, name, tutor_id, monitor_id, created_at
-- Students are in groups, tutors/monitors manage groups
```

**schedules**
```sql
id (UUID), group_id, day_of_week (1-7), start_time, end_time, created_at
-- Weekly recurring schedule
```

**lessons**
```sql
id (UUID), group_id, lesson_date, title, created_at
-- Specific instances created from schedules
```

**attendance**
```sql
id (UUID), lesson_id, student_id, status (present/absent/late/excused), 
marked_by, notes, created_at
```

---

## 🔑 Environment Variables

### Web Admin (.env.local):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxx

# Optional: API endpoints
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Mobile (No .env needed)
```dart
// Set in supabase_service.dart
const String supabaseUrl = 'https://xxxxx.supabase.co';
const String supabaseKey = 'eyxxxx';
```

---

## 📡 API Patterns

### Supabase Data Fetching (Next.js)

```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Usage in component
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('group_id', groupId)
  .order('created_at', { ascending: false });
```

### Supabase in Flutter

```dart
// lib/services/supabase_service.dart
final supabase = Supabase.instance.client;

// Fetch data
final data = await supabase
  .from('students')
  .select()
  .eq('group_id', groupId);

// Insert record
await supabase.from('attendance').insert({
  'lesson_id': lessonId,
  'student_id': studentId,
  'status': 'present'
});
```

---

## 🎨 UI/Design Guidelines

### Web Admin (Next.js):
- **Framework:** React with CSS Modules
- **Icons:** Lucide React
- **Color scheme:** Professional dark/light themes
- **Components:** Reusable, modular components

### Mobile App (Flutter):
- **Framework:** Flutter widgets
- **Icons:** Material Icons + custom
- **Theme:** Material 3 design system
- **State:** Provider/Riverpod for state management

---

## 🧪 Testing Guidelines

### Web Testing:
```bash
# Unit tests (Jest)
npm test

# E2E tests (Playwright/Cypress)
npm run test:e2e
```

### Mobile Testing:
```bash
# Widget tests
flutter test

# Integration tests  
flutter test integration_test/
```

---

## 🚢 Deployment

### Web (Vercel):
```bash
# Automatic on push to main
# Or manual:
vercel deploy --prod
```

### Mobile (GitHub Actions):
- APK automatically built on release tag
- Download from GitHub Releases

### Database (Supabase):
```bash
# Use Supabase dashboard
# Or CLI: supabase db pull/push
```

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to Supabase"
```
Solution:
1. Verify SUPABASE_URL and SUPABASE_KEY are correct
2. Check network connectivity
3. Verify auth token not expired
4. Check RLS policies allow access
```

### Issue: "Excel import fails"
```
Solution:
1. Validate Excel format matches template
2. Check for special characters in Cyrillic text
3. Ensure no merged cells
4. Verify column headers match expected
```

### Issue: "Offline mode not syncing"
```
Solution:
1. Check network connectivity
2. Verify Hive local db not corrupted
3. Check Supabase auth token fresh
4. Manual sync button (debug feature)
```

### Issue: "Attendance edit 24h limit not working"
```
Solution:
1. Verify lesson timestamp in UTC
2. Check server time is correct
3. Implement validation on backend
4. Add client-side warning before exceeding limit
```

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| TZ.md | Technical requirements & system overview |
| DAVOMAD_MVP_Architecture.md | System architecture & data flow |
| DAVOMAD_Admin_Dashboard_MVP.md | Admin panel UI specifications |
| DAVOMAD_Project_Overview.md | High-level project organization |
| DAVOMAD_Status_and_Issues.md | Known issues & roadmap |
| This guide | Developer quick reference |

---

## 🔐 Security Reminders

- ✅ Never commit `.env` files or secrets
- ✅ Always validate user input on server
- ✅ Use parameterized queries (Supabase does this)
- ✅ Check RLS policies before deployment
- ✅ Don't expose API keys in client code (use Supabase anon key only)
- ✅ Verify authentication before sensitive operations
- ✅ Log security-relevant events for audit trail
- ✅ Test with SQL injection/XSS in mind

---

## 🎯 Code Quality Standards

### Naming Conventions:
- **Functions:** camelCase (e.g., `fetchAttendance`)
- **Classes/Components:** PascalCase (e.g., `StudentList`)
- **Constants:** SCREAMING_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Files:** kebab-case for components (e.g., `student-list.tsx`)

### Code Style:
```
Web: Prettier + ESLint
Mobile: Dart style + analysis_options.yaml
Database: Consistent formatting in SQL files
```

### Comments:
```typescript
// Use for explaining WHY, not WHAT
// WHAT should be obvious from code

// Good:
// Skip auth check for public routes
if (publicRoutes.includes(route)) { ... }

// Bad:
// Set isAuthed to true
isAuthed = true;
```

---

## 📞 Getting Help

1. **For technical questions:** Check TZ.md and architecture docs
2. **For bugs:** Reference DAVOMAD_Status_and_Issues.md
3. **For design:** Check DAVOMAD_Admin_Dashboard_MVP.md
4. **For data flow:** Check DAVOMAD_MVP_Architecture.md

---

## 🔄 Git Workflow

```bash
# Feature branch
git checkout -b feature/attendance-notifications

# Commit messages (conventional commits)
git commit -m "feat: add push notifications for attendance"
git commit -m "fix: prevent teacher time limit bypass"
git commit -m "docs: update RLS policies"

# Push and create PR
git push origin feature/...
# Create PR with description referencing any issues
```

---

## ⚡ Performance Tips

1. **Database:**
   - Use proper indexes
   - Avoid N+1 queries
   - Implement pagination

2. **Web:**
   - Code splitting
   - Image optimization
   - Lazy load components

3. **Mobile:**
   - Use ListView.builder for long lists
   - Cache API responses
   - Compress images before upload

---

**Happy coding! 🚀**

For questions or updates to this guide, please submit a PR or issue.
