// Database types for Thiếu Nhi Management System

export type Sector = "CHIÊN" | "ẤU" | "THIẾU" | "NGHĨA";

export type SessionType = "THURSDAY" | "SUNDAY";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type StudentStatus = "ACTIVE" | "DELETED";

// User/Profile types
export interface User {
  id: string;
  username: string;
  email?: string | null;
  phone: string;
  role: string;
  saint_name?: string | null;
  full_name: string;
  date_of_birth?: string | null;
  address?: string | null;
  status: UserStatus;
  sector?: Sector | null;
  class_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  username: string;
  password: string;
  phone: string;
  role: string;
  saint_name?: string;
  full_name: string;
  date_of_birth?: string;
  address?: string;
  sector?: Sector;
  class_id?: string;
}

export interface UpdateUserInput {
  password?: string;
  role?: string;
  saint_name?: string;
  full_name?: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  sector?: Sector;
  class_id?: string;
  status?: UserStatus;
}

// Class types
export interface Class {
  id: string;
  name: string;
  sector: Sector;
  created_at: string;
  updated_at: string;
}

export interface ClassWithTeachers extends Class {
  teachers: TeacherAssignment[];
  student_count: number;
}

export interface TeacherAssignment {
  id: string;
  class_id: string;
  teacher_id: string;
  is_primary: boolean;
  teacher: {
    id: string;
    saint_name?: string | null;
    full_name: string;
    phone: string;
  };
}

export interface CreateClassInput {
  name: string;
  sector: Sector;
}

export interface UpdateClassInput {
  name?: string;
  sector?: Sector;
}

// Student types
export interface Student {
  id: string;
  student_code: string;
  class_id: string;
  saint_name?: string | null;
  full_name: string;
  date_of_birth: string;
  phone?: string | null;
  parent_phone_1?: string | null;
  parent_phone_2?: string | null;
  address?: string | null;
  notes?: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentWithGrades extends Student {
  class_name: string;
  sector: Sector;
  grades: StudentGrades;
  attendance_stats: AttendanceStats;
}

export interface StudentGrades {
  semester_1_45min?: number | null;
  semester_1_exam?: number | null;
  semester_2_45min?: number | null;
  semester_2_exam?: number | null;
  catechism_avg?: number | null;
  attendance_avg?: number | null;
  total_avg?: number | null;
}

export interface AttendanceStats {
  thursday_count: number;
  sunday_count: number;
  thursday_score?: number | null;
  sunday_score?: number | null;
  attendance_score?: number | null;
}

export interface CreateStudentInput {
  student_code: string;
  class_id: string;
  saint_name?: string;
  full_name: string;
  date_of_birth: string;
  phone?: string;
  parent_phone_1?: string;
  parent_phone_2?: string;
  address?: string;
  notes?: string;
}

export interface UpdateStudentInput {
  student_code?: string;
  class_id?: string;
  saint_name?: string;
  full_name?: string;
  date_of_birth?: string;
  phone?: string;
  parent_phone_1?: string;
  parent_phone_2?: string;
  address?: string;
  notes?: string;
  status?: StudentStatus;
}

export interface UpdateStudentGradesInput {
  student_id: string;
  semester_1_45min?: number | null;
  semester_1_exam?: number | null;
  semester_2_45min?: number | null;
  semester_2_exam?: number | null;
}

// Attendance types
export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  session_date: string;
  session_type: SessionType;
  is_present: boolean;
  notes?: string | null;
  created_at: string;
}

export interface CreateAttendanceInput {
  student_id: string;
  class_id: string;
  session_date: string;
  session_type: SessionType;
  is_present: boolean;
  notes?: string;
}

export interface AttendanceRecord {
  student_id: string;
  student_name: string;
  is_present: boolean;
}

export interface BulkAttendanceInput {
  class_id: string;
  session_date: string;
  session_type: SessionType;
  records: AttendanceRecord[];
}

// Academic Year types
export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  total_weeks: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

// Dashboard/Stats types
export interface DashboardSummary {
  academic_year: string;
  total_weeks: number;
  total_sectors: number;
  total_classes: number;
  total_students: number;
  total_teachers: number;
}

export interface SectorStats {
  sector: Sector;
  total_classes: number;
  total_students: number;
  total_teachers: number;
  attendance_avg: number;
  study_avg: number;
}

export interface RecentAttendance {
  session_type: SessionType;
  session_date: string;
  present_count: number;
  pending_count: number;
}

// Performance/Chart types
export interface WeeklyAttendanceData {
  week_start: string;
  week_end: string;
  chien: number;
  au: number;
  thieu: number;
  nghia: number;
}

export interface ClassAttendanceData {
  class_name: string;
  total_present: number;
}

// Report types
export type ReportType = "ATTENDANCE" | "GRADES";

export type TimeFilterType = "WEEK" | "DATE_RANGE";

export interface ReportFilter {
  time_filter_type: TimeFilterType;
  week_start?: string;
  week_end?: string;
  start_date?: string;
  end_date?: string;
  report_type: ReportType;
  sector?: Sector;
  class_id?: string;
  academic_year_id?: string;
  session_type?: SessionType | "ALL";
}

export interface GradeReportColumn {
  thursday_attendance: boolean;
  semester_1_exam: boolean;
  catechism_study: boolean;
  semester_2_45min: boolean;
  catechism_avg: boolean;
  semester_2_exam: boolean;
  semester_1_45min: boolean;
  total_avg: boolean;
}

export interface AttendanceReportData {
  student_code: string;
  student_name: string;
  class_name: string;
  thursday_count: number;
  sunday_count: number;
  total_count: number;
  attendance_rate: number;
}

export interface GradeReportData {
  student_code: string;
  student_name: string;
  class_name: string;
  thursday_attendance?: number;
  semester_1_45min?: number;
  semester_1_exam?: number;
  semester_2_45min?: number;
  semester_2_exam?: number;
  catechism_avg?: number;
  attendance_avg?: number;
  total_avg?: number;
}

// Settings types
export interface UserSettings {
  notifications_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
}

export interface SystemSettings {
  default_password: string;
  attendance_calculation_mode: "AUTO" | "MANUAL";
  grade_weights: {
    catechism: number;
    attendance: number;
  };
  attendance_weights: {
    thursday: number;
    sunday: number;
  };
}
