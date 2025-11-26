/**
 * Attendance Score Calculation Utility
 *
 * Formula: Điểm danh = (Số tuần có T5 × 0.4 + Số tuần có CN × 0.6) × (10 ÷ Tổng tuần năm học)
 *
 * Rules:
 * - Count by WEEK, not by session (max 1 Thursday/week, max 1 Sunday/week)
 * - Non-Sunday weekdays (Mon-Sat) count as Thursday
 * - Sunday counts as Sunday
 * - total_weeks comes from academic_years.total_weeks
 */

// ============================================================================
// TYPES
// ============================================================================

export type NormalizedWeekday = "thursday" | "sunday" | "other";

export interface AttendanceRecordInput {
  student_id: string;
  event_date: string | null;
  status?: string | null;
  weekday?: string | null;
}

export interface WeeklyAttendanceSummary {
  weekKey: string;
  hasThursdayPresent: boolean;
  hasSundayPresent: boolean;
}

export interface StudentWeeklyAttendance {
  studentId: string;
  weeksWithThursday: number;
  weeksWithSunday: number;
}

export interface AttendanceScoreResult {
  weeksWithThursday: number;
  weeksWithSunday: number;
  totalWeeks: number;
  score: number | null;
}

// ============================================================================
// HELPER FUNCTIONS (consolidated from duplicated code)
// ============================================================================

/**
 * Normalize text for comparison - remove diacritics and special characters
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

/**
 * Convert unknown value to number or null
 */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Check if status indicates presence
 */
export function isPresentStatus(status?: string | null): boolean {
  if (!status) return false;
  const normalized = normalizeText(status);
  if (!normalized) return false;

  // Present values
  if (
    normalized === "PRESENT" ||
    normalized === "YES" ||
    normalized === "TRUE" ||
    normalized === "1" ||
    normalized === "ATTEND" ||
    normalized === "ATTENDED" ||
    normalized === "CO" ||
    normalized === "X" ||
    normalized === "P"
  ) {
    return true;
  }

  // Absent values
  if (
    normalized === "ABSENT" ||
    normalized === "NO" ||
    normalized === "FALSE" ||
    normalized === "0" ||
    normalized === "VANG" ||
    normalized === "NGHI"
  ) {
    return false;
  }

  return false;
}

/**
 * Resolve weekday from explicit weekday field or from event date
 * Non-Sunday weekdays count as "thursday"
 */
export function resolveWeekday(
  weekday?: string | null,
  eventDate?: string | null,
): NormalizedWeekday {
  // First, try to resolve from explicit weekday field
  if (weekday) {
    const normalized = normalizeText(weekday);
    if (
      normalized.includes("SUNDAY") ||
      normalized.includes("CHUNHAT") ||
      normalized === "CN" ||
      normalized === "SUN"
    ) {
      return "sunday";
    }
    if (
      normalized.includes("THURSDAY") ||
      normalized.includes("THUNAM") ||
      normalized.includes("THU5") ||
      normalized === "T5"
    ) {
      return "thursday";
    }
  }

  // Fallback: derive from event date
  if (eventDate) {
    const parsed = new Date(`${eventDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const weekdayIndex = parsed.getUTCDay();
      // Sunday = 0
      if (weekdayIndex === 0) return "sunday";
      // All other days (Mon-Sat) count as Thursday per business rules
      return "thursday";
    }
  }

  return "other";
}

// ============================================================================
// WEEK CALCULATION FUNCTIONS
// ============================================================================

/**
 * Get ISO week number from date (1-53)
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get unique week identifier from date string (format: YYYY-Www)
 */
export function getWeekIdentifier(dateStr: string): string | null {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const weekNum = getISOWeekNumber(date);
  // Get the year of the Thursday of the week (ISO week year)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();

  return `${isoYear}-W${weekNum.toString().padStart(2, "0")}`;
}

// ============================================================================
// ATTENDANCE GROUPING BY WEEK
// ============================================================================

/**
 * Group attendance records by student and week
 * Returns Map<studentId, Map<weekKey, WeeklyAttendanceSummary>>
 */
export function groupAttendanceByStudentAndWeek(
  records: AttendanceRecordInput[],
): Map<string, Map<string, WeeklyAttendanceSummary>> {
  const studentWeekMap = new Map<string, Map<string, WeeklyAttendanceSummary>>();

  for (const record of records) {
    const studentId = record.student_id?.trim();
    const eventDate = record.event_date?.slice(0, 10);

    if (!studentId || !eventDate) continue;
    if (!isPresentStatus(record.status)) continue;

    const weekKey = getWeekIdentifier(eventDate);
    if (!weekKey) continue;

    const weekday = resolveWeekday(record.weekday, eventDate);
    // Skip "other" - only process thursday and sunday
    if (weekday === "other") continue;

    let weekMap = studentWeekMap.get(studentId);
    if (!weekMap) {
      weekMap = new Map<string, WeeklyAttendanceSummary>();
      studentWeekMap.set(studentId, weekMap);
    }

    let summary = weekMap.get(weekKey);
    if (!summary) {
      summary = {
        weekKey,
        hasThursdayPresent: false,
        hasSundayPresent: false,
      };
      weekMap.set(weekKey, summary);
    }

    if (weekday === "sunday") {
      summary.hasSundayPresent = true;
    } else {
      // Non-Sunday weekdays count as Thursday
      summary.hasThursdayPresent = true;
    }
  }

  return studentWeekMap;
}

/**
 * Calculate weekly attendance counts for a single student
 */
export function calculateStudentWeeklyAttendance(
  studentId: string,
  weekMap: Map<string, WeeklyAttendanceSummary>,
): StudentWeeklyAttendance {
  let weeksWithThursday = 0;
  let weeksWithSunday = 0;

  weekMap.forEach((summary) => {
    if (summary.hasThursdayPresent) weeksWithThursday++;
    if (summary.hasSundayPresent) weeksWithSunday++;
  });

  return {
    studentId,
    weeksWithThursday,
    weeksWithSunday,
  };
}

// ============================================================================
// MAIN SCORE CALCULATION (NEW FORMULA)
// ============================================================================

const THURSDAY_WEIGHT = 0.4;
const SUNDAY_WEIGHT = 0.6;
const MAX_SCORE = 10;

/**
 * Calculate attendance score using the new formula:
 * Score = (weeksWithThursday × 0.4 + weeksWithSunday × 0.6) × (10 ÷ totalWeeks)
 */
export function calculateWeeklyAttendanceScore(
  weeksWithThursday: number,
  weeksWithSunday: number,
  totalWeeks: number,
): AttendanceScoreResult {
  if (totalWeeks <= 0) {
    return {
      weeksWithThursday,
      weeksWithSunday,
      totalWeeks,
      score: null,
    };
  }

  const weightedSum = weeksWithThursday * THURSDAY_WEIGHT + weeksWithSunday * SUNDAY_WEIGHT;
  const score = weightedSum * (MAX_SCORE / totalWeeks);

  return {
    weeksWithThursday,
    weeksWithSunday,
    totalWeeks,
    score: Number(score.toFixed(2)),
  };
}

// ============================================================================
// BULK CALCULATION FOR MULTIPLE STUDENTS
// ============================================================================

/**
 * Calculate attendance scores for all students from attendance records
 * Returns Map<studentId, AttendanceScoreResult>
 */
export function calculateBulkAttendanceScores(
  records: AttendanceRecordInput[],
  totalWeeks: number,
): Map<string, AttendanceScoreResult> {
  const studentWeekMap = groupAttendanceByStudentAndWeek(records);
  const results = new Map<string, AttendanceScoreResult>();

  studentWeekMap.forEach((weekMap, studentId) => {
    const weeklyAttendance = calculateStudentWeeklyAttendance(studentId, weekMap);
    const scoreResult = calculateWeeklyAttendanceScore(
      weeklyAttendance.weeksWithThursday,
      weeklyAttendance.weeksWithSunday,
      totalWeeks,
    );
    results.set(studentId, scoreResult);
  });

  return results;
}

// ============================================================================
// LEGACY COMPATIBILITY - Simple attendance score (present/total)
// ============================================================================

/**
 * Simple attendance score calculation (for backwards compatibility)
 * Formula: (present / total) × 10
 */
export function calculateSimpleAttendanceScore(
  present?: number | null,
  total?: number | null,
): number | null {
  if (present == null || total == null || total === 0) {
    return null;
  }
  return Number(((present / total) * 10).toFixed(2));
}

// ============================================================================
// CATECHISM AVERAGE CALCULATION
// ============================================================================

/**
 * Calculate catechism (religious studies) average
 * Formula: (45min_HK1 + 45min_HK2 + Exam_HK1×2 + Exam_HK2×2) / 6
 */
export function calculateCatechismAverage(
  semester145?: number | null,
  semester1Exam?: number | null,
  semester245?: number | null,
  semester2Exam?: number | null,
): number | null {
  if (
    semester145 == null &&
    semester1Exam == null &&
    semester245 == null &&
    semester2Exam == null
  ) {
    return null;
  }

  const sum =
    (semester145 ?? 0) + (semester245 ?? 0) + (semester1Exam ?? 0) * 2 + (semester2Exam ?? 0) * 2;

  return Number((sum / 6).toFixed(2));
}

// ============================================================================
// TOTAL SCORE CALCULATION
// ============================================================================

/**
 * Calculate total/final score
 * Formula: (Catechism_Avg × 0.6) + (Attendance_Avg × 0.4)
 */
export function calculateTotalScore(
  catechismAvg: number | null,
  attendanceAvg: number | null,
): number | null {
  if (catechismAvg == null && attendanceAvg == null) {
    return null;
  }
  const catechismComponent = catechismAvg ?? 0;
  const attendanceComponent = attendanceAvg ?? 0;
  return Number((catechismComponent * 0.6 + attendanceComponent * 0.4).toFixed(2));
}
