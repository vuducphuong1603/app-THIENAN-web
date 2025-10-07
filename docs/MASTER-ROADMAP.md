# Thiếu Nhi Web App - Master Implementation Roadmap

## Project Overview

**Church Youth Education Management System**
Web application for Giáo Xứ Thiên Ân Catholic Church to manage religious education programs across four branches (Chiên, Ấu, Thiếu, Nghĩa), supporting administrative staff and catechists in tracking student attendance, grades, and generating reports.

### Technology Stack

- **Frontend:** Next.js 15.5.4, React 19, TypeScript
- **Backend:** Supabase (shared database with mobile app)
- **Styling:** Tailwind CSS v4
- **Data Fetching:** TanStack React Query v5
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts v3
- **Exports:** xlsx/exceljs for Excel, html2canvas for PNG

### User Roles

1. **Admin (Ban điều hành)** - Full system access, user/class/student management, analytics, settings
2. **Sector Leader (Phân đoàn trưởng)** - Branch-level management (future phase)
3. **Catechist (Giáo lý viên)** - Teacher role, manage assigned class students, limited reporting

---

## Epic Overview & Dependencies

```
Sprint 1-2: Foundation
├─ Epic 1: Authentication & Session Management ✓ (3 stories)
│  └─ Foundation for all features
│
└─ Epic 2: Dashboard & Overview System ✓ (4 stories)
   └─ Depends on: Epic 1

Sprint 3-4: Core Management
├─ Epic 3: User Management System (Admin) ✓ (4 stories)
│  └─ Depends on: Epic 1
│
└─ Epic 4: Class Management System (Admin) ✓ (4 stories)
   └─ Depends on: Epic 1, Epic 3

Sprint 5-6: Student Operations (Most Complex)
└─ Epic 5: Student Management System ✓ (4 stories)
   └─ Depends on: Epic 4, attendance system

Sprint 7-8: Analytics & Reporting
├─ Epic 6: Performance Analytics & Comparison ✓ (3 stories)
│  └─ Depends on: Epic 2, attendance data
│
└─ Epic 7: Reporting System ✓ (4 stories)
   └─ Depends on: Epic 5, attendance data

Sprint 9: Configuration
└─ Epic 8: System Settings & Configuration ✓ (4 stories)
   └─ Depends on: Epic 1, affects all features
```

---

## Epic Summaries

### Epic 1: Authentication & Session Management
**Goal:** Secure login system with role-based access control

**Stories:**
1. Login Page UI & Form Validation
2. Authentication Logic & Session Management
3. Protected Routes & Role-Based Redirects

**Complexity:** Medium | **Sprint:** 1

---

### Epic 2: Dashboard & Overview System
**Goal:** Role-based dashboards with statistics and branch analytics

**Stories:**
1. Admin Dashboard - Overview Statistics Cards
2. Admin Dashboard - Branch Statistics Breakdown
3. Admin Dashboard - 7-Day Attendance Summary
4. Teacher Dashboard - Simplified Overview

**Complexity:** Medium-High | **Sprint:** 2

---

### Epic 3: User Management System (Admin Only)
**Goal:** Comprehensive CRUD for catechist and staff accounts

**Stories:**
1. User List Display & Search/Filter Interface
2. Create New User Form
3. Edit User Form & Account Lock/Unlock
4. Excel Import Bulk User Creation

**Complexity:** High | **Sprint:** 3

---

### Epic 4: Class Management System (Admin Only)
**Goal:** Manage classes across branches with teacher assignments

**Stories:**
1. Class List Display with Branch Grouping
2. Create New Class
3. Edit Class & Teacher Assignment Management
4. View Class Roster & Delete Class

**Complexity:** High | **Sprint:** 4

---

### Epic 5: Student Management System
**Goal:** Comprehensive student management with grade calculations

**Stories:**
1. Student List Display with Search & Filters
2. Grade Calculation Engine & Formulas
3. Create & Edit Student with Grade Entry
4. Inline Grade Editing & Excel Import

**Key Formulas:**
- **Catechism Average:** `(45' HK1 + 45' HK2 + Thi HK1 × 2 + Thi HK2 × 2) / 6`
- **Attendance Score:** `(Thứ 5 × 0.4 + CN × 0.6) × (10 / Tổng tuần)`
- **Total Average:** `Giáo lý × 0.6 + Điểm danh × 0.4`

**Complexity:** Very High | **Sprint:** 5-6

---

### Epic 6: Performance Analytics & Comparison
**Goal:** Visual trend analysis with charts and branch comparisons

**Stories:**
1. 3-Week Sunday Attendance Trend Chart
2. 3-Week Thursday Attendance Trend Chart
3. Class-Level Statistics Chart with Filters

**Complexity:** Medium-High | **Sprint:** 7

---

### Epic 7: Reporting System
**Goal:** Generate customizable reports with multiple export formats

**Stories:**
1. Report Builder Interface with Filters
2. Grade Report Builder with Column Selection
3. Report Preview & Data Generation
4. Export to PNG and Excel

**Complexity:** High | **Sprint:** 8

---

### Epic 8: System Settings & Configuration
**Goal:** User profile management and system-wide settings

**Stories:**
1. User Profile Management
2. Password Change with Verification
3. Academic Year Management (Admin Only)
4. System Settings & Notifications (Admin Only)

**Complexity:** Medium | **Sprint:** 9

---

## Implementation Roadmap

### Phase 1: Foundation (Sprints 1-2)
**Goal:** Establish authentication and basic navigation

- ✅ Epic 1: Authentication & Session Management
- ✅ Epic 2: Dashboard & Overview System

**Deliverables:**
- Users can log in with mobile app credentials
- Role-based dashboards display statistics
- Navigation menu adapts to user role

---

### Phase 2: Core Management (Sprints 3-4)
**Goal:** Enable admin to set up organizational structure

- ✅ Epic 3: User Management System (Admin)
- ✅ Epic 4: Class Management System (Admin)

**Deliverables:**
- Admins can create catechist accounts
- Classes organized by branch with teacher assignments
- Excel import for bulk user creation

---

### Phase 3: Student Operations (Sprints 5-6)
**Goal:** Primary feature - comprehensive student management

- ✅ Epic 5: Student Management System

**Deliverables:**
- Full CRUD for student records
- Automatic grade calculations
- Excel import for student enrollment
- Teachers can manage their class students

---

### Phase 4: Analytics & Reporting (Sprints 7-8)
**Goal:** Data visualization and export capabilities

- ✅ Epic 6: Performance Analytics & Comparison
- ✅ Epic 7: Reporting System

**Deliverables:**
- Trend charts for attendance analysis
- Customizable attendance and grade reports
- Export to PNG and Excel formats

---

### Phase 5: Configuration (Sprint 9)
**Goal:** System maintenance and user self-service

- ✅ Epic 8: System Settings & Configuration

**Deliverables:**
- User profile editing and password changes
- Academic year management
- System-wide configuration settings

---

## Database Schema Requirements

### Core Tables
- `auth.users` - Supabase authentication (shared with mobile)
- `profiles` - User profiles with role, contact info
- `academic_years` - Academic year definitions with start/end dates, total weeks
- `branches` - Four branches (Chiên, Ấu, Thiếu, Nghĩa)
- `classes` - Classes assigned to branches
- `teacher_assignments` - Junction table (teacher_id, class_id, role: primary/assistant)
- `students` - Student records linked to classes and academic years
- `attendance_records` - Daily attendance (student_id, date, present, day_of_week)
- `system_settings` - Key-value configuration storage

### Key Relationships
- Students → Classes (many-to-one)
- Classes → Branches (many-to-one)
- Teachers → Classes (many-to-many via teacher_assignments)
- Students → Attendance Records (one-to-many)
- All entities → Academic Year (for historical tracking)

---

## Critical Success Factors

### Performance Requirements
- Dashboard loads within 2 seconds
- Student list pagination supports 500+ students
- Report generation completes within 5 seconds for 100 students
- Grade calculations execute in < 100ms per student

### Data Integrity
- Grade formulas match mobile app exactly
- Attendance scores calculate correctly from records
- Soft deletes preserve historical data
- Academic year switching maintains data consistency

### Security & Permissions
- Role-based access enforced at route level
- Teachers can only access their assigned classes
- Admins have full system access
- Password changes require current password verification

### User Experience
- Vietnamese language throughout interface
- Responsive design (mobile, tablet, desktop)
- Branch color coding consistent (Chiên=pink, Ấu=green, Thiếu=blue, Nghĩa=yellow)
- Clear error messages and validation feedback

---

## Risk Management

### High-Risk Areas
1. **Epic 5 (Student Management)** - Complex grade calculations
   - Mitigation: Unit tests for all formulas, cross-verify with mobile app
2. **Epic 7 (Reporting)** - Large report exports may cause browser issues
   - Mitigation: Pagination, file size warnings, streaming exports
3. **Epic 8 (Academic Year)** - Year switching could cause data inconsistencies
   - Mitigation: Confirmation dialogs, preserve all historical data

### Rollback Strategy
Each epic includes rollback plan:
- Disable feature route if critical issues
- Users continue with mobile app as fallback
- Data preserved in Supabase for recovery

---

## Testing Strategy

### Story-Level Testing
- Unit tests for calculation functions
- Integration tests for API routes
- Component tests for forms and interactions

### Epic-Level Testing
- End-to-end testing of complete workflows
- Role-based permission verification
- Cross-browser compatibility (Chrome, Firefox, Safari)
- Performance testing with realistic data volumes

### Acceptance Criteria
- All story acceptance criteria met
- No regression in previously completed features
- Manual testing completed with real user scenarios
- Performance requirements satisfied

---

## Next Steps

1. **Review & Approval:** Product Owner approves epic breakdown
2. **Story Refinement:** Dev team breaks stories into technical tasks
3. **Database Setup:** Create/verify Supabase schema
4. **Sprint Planning:** Assign stories to developers, set sprint goals
5. **Development:** Begin with Epic 1 in Sprint 1
6. **Regular Reviews:** Demo completed epics at end of each sprint

---

## Epic File Locations

All epic documentation stored in `/docs/` directory:

1. `epic-1-authentication-session-management.md`
2. `epic-2-dashboard-overview-system.md`
3. `epic-3-user-management-system.md`
4. `epic-4-class-management-system.md`
5. `epic-5-student-management-system.md`
6. `epic-6-performance-analytics-comparison.md`
7. `epic-7-reporting-system.md`
8. `epic-8-system-settings-configuration.md`

**Stories will be created in:** `/docs/stories/` following pattern `story-{epic#}-{story#}-{title}.md`

---

**Document Version:** 1.0
**Created:** 2025-10-07
**Owner:** Product Manager (PM)
**Status:** Epic Planning Complete ✅
