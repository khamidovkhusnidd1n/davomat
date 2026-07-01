# DAVOMAD - Admin Dashboard (MVP)

## Overview

The Admin Dashboard is the central management panel for educational
organizations. It allows administrators to manage students, teachers,
groups, lessons, attendance, and reports through a web interface.

------------------------------------------------------------------------

# Sidebar Menu

``` text
🏠 Dashboard
👨‍🎓 Students
👨‍🏫 Teachers
👥 Groups
📚 Lessons
📊 Attendance
📈 Reports
⚙️ Settings
👤 Profile
```

------------------------------------------------------------------------

# Dashboard

## Statistics Cards

-   Total Students
-   Total Teachers
-   Total Groups
-   Today's Lessons
-   Today's Attendance Rate
-   Today's Absent Students

## Charts

-   Weekly Attendance
-   Monthly Attendance
-   Top Performing Groups

## Recent Activity

``` text
• New student added
• Teacher started lesson
• Attendance submitted
• New group created
```

------------------------------------------------------------------------

# Students

## Features

-   Add Student (yakkalik)
-   Import Students from Excel (`.xls`/`.xlsx` shablon orqali)
-   Edit Student
-   Delete Student
-   Search Students
-   Filter by Group

## Table

  Name   Group   Phone   Attendance   Status
  ------ ------- ------- ------------ --------

------------------------------------------------------------------------

# Teachers

## Features

-   Add Teacher (yakkalik)
-   Import Teachers from Excel (`.xls`/`.xlsx` shablon orqali)
-   Edit Teacher
-   Delete Teacher
-   Assign Groups

## Table

  Name   Phone   Groups   Status
  ------ ------- -------- --------

------------------------------------------------------------------------

# Groups

## Features

-   Create Group (yakkalik)
-   Import Groups from Excel (`.xls`/`.xlsx` shablon orqali)
-   Edit Group
-   Archive Group
-   Delete Group

## Information

-   Group Name
-   Teacher
-   Course
-   Student Count
-   Schedule
-   Status

------------------------------------------------------------------------

# Lessons

## Features

-   View Lessons
-   Create Lesson
-   Edit Lesson
-   View Attendance

## Information

-   Lesson Title
-   Date
-   Group
-   Teacher
-   Attendance Summary

------------------------------------------------------------------------

# Attendance

## Filters

-   Today
-   This Week
-   This Month
-   Group
-   Teacher

## Status

``` text
✅ Present
❌ Absent
⏰ Late
```

## Table

  Student   Group   Lesson   Status   Time
  --------- ------- -------- -------- ------

------------------------------------------------------------------------

# Reports

## Available Reports

-   Daily Attendance
-   Weekly Attendance
-   Monthly Attendance
-   Student Report
-   Teacher Report
-   Group Report

## Export

-   PDF
-   Excel (Future Version)

------------------------------------------------------------------------

# Settings

## Organization

-   Organization Name
-   Logo
-   Phone Number
-   Address

## User Management

-   Admin Accounts
-   Password Reset
-   Role Management

------------------------------------------------------------------------

# Profile

-   Personal Information
-   Change Password
-   Logout

------------------------------------------------------------------------

# MVP Modules

-   Dashboard
-   Students
-   Teachers
-   Groups
-   Lessons
-   Attendance
-   Reports

------------------------------------------------------------------------

# Excel Import Handling & Validation

To prevent data corruption, Excel uploads must follow these rules:
- **Templates:** Admin can download pre-formatted Excel templates for Students, Teachers, and Groups.
- **Validation:** 
  - Duplicate check: Verify phone number/email are unique before inserting.
  - Organization binding: All imported records are automatically assigned to the active Admin's `organization_id`.
  - Errors: Show list of failed rows (e.g., "Line 5: Invalid phone number").
