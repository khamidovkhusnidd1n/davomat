# ⚠️ DAVOMAD - Project Status & Known Issues

---

## 📊 Current Project Status

**Phase:** MVP (Minimum Viable Product)  
**Status:** Active Development  
**Last Updated:** July 3, 2026

### ✅ Completed Features:
- [x] Basic user authentication (Admin, Teacher, Student roles)
- [x] Attendance record creation and viewing
- [x] Admin dashboard with statistics
- [x] Mobile app for teachers/monitors
- [x] Flutter-based teacher interface
- [x] Supabase PostgreSQL database
- [x] Basic RLS (Row Level Security) policies
- [x] Schedule/lesson management
- [x] Group management system

### 🔄 In Progress:
- [ ] Excel import optimization (smart parser for complex formats)
- [ ] RLS hardening for multi-tenant isolation
- [ ] Offline sync functionality
- [ ] Advanced reporting features

### ❌ Known Issues & Weak Points

---

## 🚨 Critical Issues

### 1. **Offline Mode Not Implemented** ⚠️ CRITICAL
**Status:** Not implemented  
**Severity:** High

**Problem:**
- If network connectivity drops, the attendance system stops working
- Teachers cannot record attendance when offline
- No data buffering or local storage

**Impact:**
- System unusable during network outages
- Data loss potential in unstable connections

**Solution (Required):**
- Implement local-first architecture with Hive/Isar
- Queue pending changes during offline
- Sync to Supabase when connection restored
- Offline indicator in UI

**Files to Update:**
- `teacher_app/lib/services/` - Add sync service
- `teacher_app/pubspec.yaml` - Add Hive dependency

---

### 2. **Organization Data Isolation Missing** ⚠️ CRITICAL
**Status:** Partially implemented  
**Severity:** High

**Problem:**
- Basic RLS exists but is not organization-aware
- No `organization_id` filtering in RLS policies
- Risk of data leakage between organizations
- Admin of Org A could potentially see Org B's data

**Impact:**
- Security vulnerability
- Data privacy violation
- Unsuitable for multi-tenant deployment

**Solution (Required):**
- Add `organization_id` column to all relevant tables
- Update RLS policies to filter by organization
- Implement proper role + organization checks

**Files to Update:**
- `supabase/migrations/` - Add org_id columns
- `fix_rls.sql` - Enhance RLS policies
- Database schema in Supabase

---

### 3. **Teacher Attendance Time Limits Not Enforced** ⚠️ HIGH
**Status:** Not implemented  
**Severity:** Medium-High

**Problem:**
- Teachers can mark attendance for any lesson, any time
- Can edit attendance for past months or future dates
- No validation on lesson dates vs. current date
- No 24-hour edit window enforcement

**Impact:**
- Data integrity issues
- Inaccurate attendance records
- Abuse potential

**Current Spec:**
- Teachers should only mark today's attendance
- Can edit within 24 hours only
- Admins can change anytime

**Solution (Required):**
- Add `marked_date` and `can_edit_until` to attendance records
- Implement backend validation before insert/update
- Check in Flutter app before allowing edits

**Files to Update:**
- `supabase/migrations/` - Add columns to attendance
- Backend API validation
- `teacher_app/lib/screens/attendance/` - Add time checks

---

## ⚠️ High Priority Issues

### 4. **No History Preservation on Student Removal** ⚠️ HIGH
**Status:** Not implemented  
**Severity:** Medium

**Problem:**
- When student leaves group or transfers, attendance history is lost
- No soft delete mechanism
- No audit trail of student-group relationships

**Impact:**
- Data loss
- Cannot generate historical reports
- No compliance with record-keeping requirements

**Solution (Recommended):**
- Implement soft delete (add `deleted_at` column)
- Create `student_group_history` table
- Mark records as archived instead of deleting
- Maintain audit trail

**Files to Update:**
- `supabase/migrations/` - Add history tracking
- API endpoints - Update to use soft deletes
- Admin UI - Show archived records option

---

### 5. **Onboarding Process Difficult** ⚠️ MEDIUM
**Status:** Partially implemented  
**Severity:** Medium

**Problem:**
- Admin must manually create all users one-by-one
- No bulk import template/guide
- No invitation system
- Excel import may have parsing issues with Cyrillic text

**Impact:**
- Slow setup for new organizations
- Poor user experience for onboarding
- Manual error-prone process

**Solution (Recommended):**
- Create Excel import templates (Students, Teachers, Groups)
- Improve Excel parser for Cyrillic characters
- Add bulk import validation warnings
- Consider invitation/self-signup flow for teachers

**Files to Update:**
- `admin/components/import/` - Enhance Excel parser
- Create template files in public directory
- `admin/pages/` - Add import guide/help

---

### 6. **No Group Assignment Tracking** ⚠️ MEDIUM
**Status:** Missing  
**Severity:** Medium

**Problem:**
- When teacher-group relationship changes, no history
- Cannot track who taught what group when
- No way to handle teacher transfers

**Impact:**
- Unclear who taught which group historically
- Cannot audit attendance records for teacher accountability
- Issues with reports

**Solution (Recommended):**
- Create `group_assignments` history table
- Track `assigned_date` and `unassigned_date`
- Link attendance to specific assignment period
- Update reports to consider history

---

## 📋 Medium Priority Issues

### 7. **Excel Import Cyrillic Handling**
**Status:** Partially working  
**Severity:** Low-Medium

**Problem:**
- Complex Excel with Cyrillic day names ("Душанба", "Сешанба", etc.)
- Merged cells not fully supported
- Custom time formats ("9-00.", "14:30") may parse incorrectly

**Impact:**
- Import failures for complex Excel files
- Manual data re-entry needed
- Poor experience for non-technical admins

**Solution (Recommended):**
- Enhance Excel parser to handle Cyrillic
- Add merge cell support
- Create flexible time format parser
- Show preview before import

---

### 8. **Limited Reporting Capabilities**
**Status:** Basic implementation  
**Severity:** Low-Medium

**Problem:**
- Only basic daily/monthly reports
- Cannot filter by date range
- No PDF/Excel export in MVP
- No comparative analysis

**Impact:**
- Limited insights for organization
- Hard to identify patterns
- No compliance reporting

**Solution (Planned for Phase 2):**
- Add date range filtering
- Implement PDF export (using lib like pdf)
- Excel export with formatting
- Advanced analytics (trends, comparisons)

---

### 9. **No Push Notifications**
**Status:** Not implemented  
**Severity:** Low-Medium

**Problem:**
- Teachers don't get reminders about lessons
- Parents aren't notified of absences
- No alerts for missing attendance records

**Impact:**
- Higher absence rates
- Parents unaware of absences
- Manual follow-up needed

**Solution (Planned for Phase 2):**
- Add FCM (Firebase Cloud Messaging) integration
- Teacher lesson reminders
- Parent SMS/Telegram alerts on absence
- Admin absence notifications

---

### 10. **Weak Session Management**
**Status:** Basic implementation  
**Severity:** Low

**Problem:**
- Token expiration may not be properly handled
- No session timeout
- No logout confirmation

**Impact:**
- Session hijacking potential (low risk in MVP)
- User devices left signed in

**Solution (Recommended):**
- Implement proper token refresh
- Add session timeout (e.g., 30 min inactivity)
- Clear tokens on logout
- Secure cookie settings

---

## 📅 Database Known Issues

### 11. **Foreign Key Constraint Issues**
**Status:** Fixed (see `drop_constraint.sql`)  
**Severity:** Low

**Details:**
- Previous schema had redundant constraints
- `drop_constraint.sql` contains cleanup
- Ensure all migrations are applied in order

---

### 12. **RLS Policy Gaps**
**Status:** Partially implemented  
**Severity:** Medium

**File:** `fix_rls.sql`

**Issues:**
- Some tables may not have proper RLS policies
- Role-based access not fully defined
- No organization-level scoping

**Solution:**
- Complete RLS audit
- Add missing policies
- Test multi-tenant scenarios

---

## 🔍 Testing & Quality Issues

### 13. **Limited Test Coverage**
**Status:** Not implemented  
**Severity:** Medium

**Problem:**
- No unit tests found in codebase
- No integration tests
- No E2E tests for critical flows

**Impact:**
- Regressions during updates
- Quality uncertainty
- Hard to maintain

**Solution (Recommended):**
- Add Flutter widget tests
- Add Next.js component tests
- Integration tests for APIs
- E2E tests for critical flows

---

### 14. **No Input Validation**
**Status:** Basic implementation  
**Severity:** Medium

**Problem:**
- Minimal client-side validation
- Backend validation may be incomplete
- No sanitization of Cyrillic text
- Excel import doesn't validate phone formats

**Impact:**
- Invalid data in database
- Potential security issues
- Poor error messages

**Solution (Recommended):**
- Add comprehensive validation layer
- Sanitize all inputs
- Validate phone numbers, emails, dates
- Better error messages

---

## 🔐 Security Issues

### 15. **Default Password Usage**
**Status:** Hardcoded  
**Severity:** Low-Medium

**Problem:**
- Teachers get default password "123456"
- Not forced to change on first login
- Weak default

**Impact:**
- Account security risk
- Users might not change password
- Known credentials

**Solution (Recommended):**
- Generate random passwords
- Force change on first login
- Use Supabase Auth native password reset flow
- Send password via secure channel

---

### 16. **No Audit Logging**
**Status:** Not implemented  
**Severity:** Low

**Problem:**
- No audit trail of who changed what
- No timestamps on modifications
- Cannot trace data changes

**Impact:**
- No accountability
- Hard to debug issues
- No compliance trail

**Solution (Recommended):**
- Create audit log table
- Log all create/update/delete operations
- Include user ID, timestamp, old/new values
- Admin audit log viewer

---

## 🚀 Performance Issues

### 17. **No Database Indexing Strategy**
**Status:** Basic  
**Severity:** Low

**Problem:**
- May lack proper indexes on frequently queried columns
- No pagination on large lists
- Possible N+1 query problems

**Impact:**
- Slow queries as data grows
- App slowdowns

**Solution (Recommended):**
- Add indexes on foreign keys
- Add indexes on frequently filtered columns
- Implement pagination
- Database query optimization

---

## 📋 Summary Table

| Issue | Severity | Status | Priority |
|-------|----------|--------|----------|
| Offline mode | 🔴 CRITICAL | Not Done | P0 |
| Data isolation | 🔴 CRITICAL | Partial | P0 |
| Attendance time limits | 🟠 HIGH | Not Done | P1 |
| History preservation | 🟠 HIGH | Not Done | P1 |
| Onboarding difficulty | 🟡 MEDIUM | Partial | P2 |
| RLS policies | 🟡 MEDIUM | Partial | P1 |
| No notifications | 🟡 MEDIUM | Not Done | P2 |
| Test coverage | 🟡 MEDIUM | None | P2 |
| Default passwords | 🟡 MEDIUM | Yes | P2 |
| Audit logging | 🔵 LOW | Not Done | P3 |

---

## 🛠️ Recommended Action Plan

### Immediate (This Sprint):
1. ✅ Fix critical data isolation issues
2. ✅ Implement attendance time limit validation
3. ✅ Add history tracking for students

### Short Term (Next 2 Weeks):
1. Implement offline sync with Hive
2. Enhance RLS policies for multi-tenancy
3. Improve Excel import Cyrillic handling
4. Add basic input validation

### Medium Term (Phase 2):
1. Push notifications (FCM)
2. Advanced reporting with PDF/Excel
3. Parent SMS/Telegram alerts
4. Test coverage (unit + E2E)

### Long Term (Phase 3+):
1. Audit logging system
2. Performance optimization
3. Enhanced onboarding flows
4. Advanced analytics

---

## 📞 Contact & Support

For issues and bug reports, reference this document and the issue number.

**File References:**
- `drop_constraint.sql` - Database constraint fixes
- `fix_rls.sql` - RLS policy fixes
- `migration.sql` - Initial schema

**Last Updated:** July 3, 2026  
**Version:** 1.0
