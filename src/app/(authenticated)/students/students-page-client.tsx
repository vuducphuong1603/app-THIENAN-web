"use client";

import { Edit, Save, Search, Trash2, Upload, UserPlus, X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Custom hook for debouncing values - improves search performance
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StudentTableSkeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import type { AppRole } from "@/types/auth";
import type { AcademicYear, Sector, StudentStatus, StudentWithGrades } from "@/types/database";
import {
  fetchAttendanceRecordsForStudents,
  fetchClasses,
  fetchSectors,
  fetchStudents,
} from "@/lib/queries/supabase";
import { fetchAcademicYears } from "@/lib/queries/academic-years";
import {
  normalizeText,
  toNumberOrNull,
  calculateBulkAttendanceScores,
  calculateCatechismAverage,
  calculateTotalScore,
} from "@/lib/calculations/attendance-score";
import type { AttendanceRecordRow, ClassRow, SectorRow, StudentRow } from "@/lib/queries/supabase";

type StudentsPageProps = {
  initialSectors?: SectorRow[];
  initialClasses?: ClassRow[];
  initialStudents?: StudentRow[];
  initialAttendanceRecords?: AttendanceRecordRow[];
  initialAcademicYears?: AcademicYear[];
  currentRole: AppRole;
  assignedClassId?: string | null;
};

const SECTOR_CODE_TO_LABEL: Record<string, Sector> = {
  CHIEN: "CHIÊN",
  AU: "ẤU",
  THIEU: "THIẾU",
  NGHIA: "NGHĨA",
};

const SECTOR_ORDER: Record<Sector, number> = {
  "CHIÊN": 0,
  "ẤU": 1,
  "THIẾU": 2,
  "NGHĨA": 3,
};

function tryResolveSector(value?: string | null): Sector | null {
  if (!value) {
    return null;
  }
  const normalized = normalizeText(value);
  const direct = SECTOR_CODE_TO_LABEL[normalized];
  if (direct) {
    return direct;
  }
  if (normalized.includes("CHIEN")) return "CHIÊN";
  if (normalized.includes("NGHIA")) return "NGHĨA";
  if (normalized.includes("THIEU")) return "THIẾU";
  if (normalized.includes("AU")) return "ẤU";
  return null;
}

function resolveSectorFromCandidates(...candidates: Array<string | null | undefined>): Sector {
  for (const candidate of candidates) {
    const resolved = tryResolveSector(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return "CHIÊN";
}

function mapSector(code?: string | null, fallbackName?: string | null): Sector {
  return resolveSectorFromCandidates(code, fallbackName);
}

function sanitizeClassId(value?: string | null) {
  return (value ?? "").trim();
}

function normalizeClassId(value?: string | null) {
  return sanitizeClassId(value).toLowerCase();
}

function parseGradeInput(value: string) {
  if (!value || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

export default function StudentsPage({
  initialSectors,
  initialClasses,
  initialStudents,
  initialAttendanceRecords,
  initialAcademicYears,
  currentRole,
  assignedClassId = null,
}: StudentsPageProps) {
  const searchParams = useSearchParams();
  const { supabase } = useAuth();
  const sanitizedAssignedClassId = sanitizeClassId(assignedClassId);
  const normalizedAssignedClassId = normalizeClassId(assignedClassId);
  const isCatechist = currentRole === "catechist";
  const hasAssignedClass = sanitizedAssignedClassId.length > 0;
  const shouldScopeQuery = isCatechist && hasAssignedClass;
  const restrictClassSelection = isCatechist;
  const queryParamClass = sanitizeClassId(searchParams?.get("class") || "");
  const initialSelectedClassValue = shouldScopeQuery ? sanitizedAssignedClassId : queryParamClass;

  const {
    data: sectorRows = [],
    isLoading: isLoadingSectors,
    error: sectorsError,
  } = useQuery<SectorRow[]>({
    queryKey: ["sectors", "list"],
    queryFn: () => fetchSectors(supabase),
    initialData: initialSectors,
    staleTime: 1000 * 60 * 30, // 30 phút - sectors hiếm khi thay đổi
  });

  const sectorById = useMemo(() => {
    const map = new Map<number, Sector>();
    sectorRows.forEach((sector) => {
      map.set(sector.id, mapSector(sector.code, sector.name));
    });
    return map;
  }, [sectorRows]);

  const {
    data: classRows = [],
    isLoading: isLoadingClasses,
    error: classesError,
  } = useQuery<ClassRow[]>({
    queryKey: ["classes", "list"],
    queryFn: () => fetchClasses(supabase),
    initialData: initialClasses,
    staleTime: 1000 * 60 * 15, // 15 phút - classes ít thay đổi
  });

  const classRowsForDisplay = useMemo(() => {
    if (!shouldScopeQuery || !normalizedAssignedClassId) {
      return classRows;
    }
    return classRows.filter(
      (cls) => normalizeClassId(cls.id) === normalizedAssignedClassId,
    );
  }, [classRows, normalizedAssignedClassId, shouldScopeQuery]);

  const classOptions = useMemo(() => {
    return classRowsForDisplay
      .map((cls) => {
        const id = sanitizeClassId(cls.id);
        const trimmedName = cls.name?.trim();
        const trimmedCode = cls.code?.toString().trim();
        const name =
          (trimmedName && trimmedName.length > 0 ? trimmedName : null) ??
          (trimmedCode && trimmedCode.length > 0 ? trimmedCode : null) ??
          cls.id;

        const sectorFromMap =
          typeof cls.sector_id === "number" && cls.sector_id !== null
            ? sectorById.get(cls.sector_id) ?? null
            : null;

        const sector =
          sectorFromMap ??
          resolveSectorFromCandidates(
            cls.sector_code,
            cls.sector_name,
            cls.sector,
            cls.branch_code,
            cls.branch_name,
            cls.branch,
            cls.name,
            cls.code,
          );

        return {
          id,
          name,
          sector,
        };
      })
      .sort((a, b) => {
        const sectorDiff = SECTOR_ORDER[a.sector] - SECTOR_ORDER[b.sector];
        if (sectorDiff !== 0) {
          return sectorDiff;
        }
        return a.name.localeCompare(b.name);
      });
  }, [classRowsForDisplay, sectorById]);

  const classMap = useMemo(() => {
    const map = new Map<string, { name: string; sector: Sector }>();
    classOptions.forEach((cls) => {
      map.set(normalizeClassId(cls.id), { name: cls.name, sector: cls.sector });
    });
    return map;
  }, [classOptions]);

  const studentQueryKey = useMemo(
    () => ["students", "list", shouldScopeQuery ? normalizedAssignedClassId : "all"],
    [normalizedAssignedClassId, shouldScopeQuery],
  );

  const studentsEnabled = !isCatechist || hasAssignedClass;
  const initialStudentsForQuery: StudentRow[] | undefined = studentsEnabled ? initialStudents : [];

  const {
    data: studentRows = [],
    isLoading: isLoadingStudents,
    error: studentsError,
  } = useQuery<StudentRow[]>({
    queryKey: studentQueryKey,
    queryFn: () =>
      shouldScopeQuery
        ? fetchStudents(supabase, { classId: sanitizedAssignedClassId })
        : fetchStudents(supabase),
    initialData: initialStudentsForQuery,
    enabled: studentsEnabled,
    staleTime: 1000 * 60 * 5, // 5 phút - students thay đổi ít thường xuyên
  });

  const studentIdsForAttendance = useMemo(() => {
    const ids = studentRows
      .map((row) => (typeof row.id === "string" ? row.id.trim() : ""))
      .filter((value): value is string => value.length > 0);
    ids.sort();
    return ids;
  }, [studentRows]);

  const {
    data: attendanceRecords = [],
    isLoading: isLoadingAttendanceRecords,
    error: attendanceRecordsError,
  } = useQuery<AttendanceRecordRow[]>({
    queryKey: ["students", "attendance-records", studentIdsForAttendance.join("|")],
    queryFn: () => fetchAttendanceRecordsForStudents(supabase, studentIdsForAttendance),
    initialData: initialAttendanceRecords, // Server-prefetched data
    enabled: studentsEnabled && studentIdsForAttendance.length > 0,
    staleTime: 1000 * 60 * 5, // 5 phút - attendance records thay đổi sau mỗi buổi điểm danh
  });

  // Fetch academic years to get total_weeks for attendance calculation
  const { data: academicYears = [] } = useQuery({
    queryKey: ["academic-years"],
    queryFn: () => fetchAcademicYears(supabase),
    initialData: initialAcademicYears, // Server-prefetched data
    staleTime: 1000 * 60 * 30, // 30 phút - academic years hiếm khi thay đổi
    enabled: !!supabase,
  });

  const totalWeeksForYear = useMemo(() => {
    const currentYear = academicYears.find((year) => year.is_current);
    return currentYear?.total_weeks ?? 0;
  }, [academicYears]);

  // Use the new week-based attendance calculation
  const attendanceScoresByStudent = useMemo(() => {
    if (!attendanceRecords.length || totalWeeksForYear <= 0) {
      return new Map<string, { weeksWithThursday: number; weeksWithSunday: number; score: number | null }>();
    }
    return calculateBulkAttendanceScores(attendanceRecords, totalWeeksForYear);
  }, [attendanceRecords, totalWeeksForYear]);

  const [students, setStudents] = useState<StudentWithGrades[]>([]);
  const studentListSnapshotRef = useRef<string>("[]");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300); // Debounce 300ms để giảm re-renders
  const [selectedClass, setSelectedClass] = useState(initialSelectedClassValue);
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "ALL">("ACTIVE");

  useEffect(() => {
    if (shouldScopeQuery) {
      setSelectedClass(sanitizedAssignedClassId);
    }
  }, [shouldScopeQuery, sanitizedAssignedClassId]);

  const defaultFormClassId = shouldScopeQuery ? sanitizedAssignedClassId : "";
  const classSelectPlaceholder = restrictClassSelection
    ? hasAssignedClass
      ? "Lớp được phân"
      : "Chưa được phân lớp"
    : "Chọn lớp";
  const classFilterPlaceholder = restrictClassSelection
    ? hasAssignedClass
      ? "Lớp được phân"
      : "Chưa được phân lớp"
    : "Tất cả lớp";
  const classSelectHelperText = restrictClassSelection
    ? hasAssignedClass
      ? "Bạn chỉ quản lý lớp được phân công."
      : "Bạn chưa được phân lớp - liên hệ quản trị để được hỗ trợ."
    : undefined;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithGrades | null>(null);
  const [editingGradesId, setEditingGradesId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    student_code: "",
    class_id: defaultFormClassId,
    saint_name: "",
    full_name: "",
    date_of_birth: "",
    phone: "",
    parent_phone_1: "",
    parent_phone_2: "",
    address: "",
    notes: "",
    semester_1_45min: "",
    semester_1_exam: "",
    semester_2_45min: "",
    semester_2_exam: "",
  });

  const [gradeEdits, setGradeEdits] = useState({
    semester_1_45min: "",
    semester_1_exam: "",
    semester_2_45min: "",
    semester_2_exam: "",
  });
  const [savingGradesId, setSavingGradesId] = useState<string | null>(null);
  const [gradeSaveError, setGradeSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  type GradeMutationPayload = {
    semester_1_45min: number | null;
    semester_1_exam: number | null;
    semester_2_45min: number | null;
    semester_2_exam: number | null;
  };

  const gradeUpdateMutation = useMutation<
    GradeMutationPayload,
    Error,
    {
      studentId: string;
      updates: GradeMutationPayload;
    }
  >({
    mutationFn: async ({ studentId, updates }) => {
      const response = await fetch(`/api/students/${studentId}/grades`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        let message = "Không thể lưu điểm lên Supabase. Vui lòng thử lại.";
        try {
          const errorBody = (await response.json()) as { error?: string };
          if (errorBody?.error) {
            message = errorBody.error;
          }
        } catch {
          // Ignore JSON parse issues; fall back to default message.
        }
        throw new Error(message);
      }

      try {
        const result = (await response.json()) as {
          data?: { grades?: GradeMutationPayload };
        };
        if (result?.data?.grades) {
          return result.data.grades;
        }
      } catch {
        // If response body is empty or invalid, fall back to optimistic values.
      }

      return updates;
    },
  });

type StudentInfoMutationPayload = {
  code: string | null;
  class_id: string | null;
  saint_name: string | null;
  full_name: string;
  date_of_birth: string | null;
  phone: string | null;
  parent_phone1: string | null;
  parent_phone2: string | null;
  address: string | null;
  notes: string | null;
  academic_hk1_fortyfive: number | null;
  academic_hk1_exam: number | null;
  academic_hk2_fortyfive: number | null;
    academic_hk2_exam: number | null;
  };

  const studentInfoMutation = useMutation<
    StudentRow,
    Error,
    { mode: "create" | "update"; id?: string; payload: StudentInfoMutationPayload }
  >({
    mutationFn: async ({ mode, id, payload }) => {
      if (mode === "create") {
        const { data, error } = await supabase
          .from("students")
          .insert([{ ...payload }])
          .select("*")
          .single();

        if (error) {
          throw new Error(error.message ?? "Không thể tạo thiếu nhi mới trên Supabase.");
        }

        if (!data) {
          throw new Error("Supabase không trả về dữ liệu thiếu nhi sau khi tạo.");
        }

        return data as StudentRow;
      }

      if (!id) {
        throw new Error("Thiếu mã thiếu nhi để cập nhật.");
      }

      const { data, error } = await supabase
        .from("students")
        .update({ ...payload })
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw new Error(error.message ?? "Không thể cập nhật thiếu nhi trên Supabase.");
      }

      if (!data) {
        throw new Error("Supabase không trả về dữ liệu thiếu nhi sau khi cập nhật.");
      }

      return data as StudentRow;
    },
  });

  const isLoadingData =
    isLoadingSectors || isLoadingClasses || isLoadingStudents || isLoadingAttendanceRecords;
  const queryError =
    (sectorsError as Error | null) ||
    (classesError as Error | null) ||
    (studentsError as Error | null) ||
    (attendanceRecordsError as Error | null);
  const queryClient = useQueryClient();
  const nameCollator = useMemo(() => new Intl.Collator("vi", { sensitivity: "base" }), []);
  const [studentSaveError, setStudentSaveError] = useState<string | null>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const isSavingInfo = isSavingStudent || studentInfoMutation.isPending;

  const calculateAge = (dob: string) => {
    if (!dob) return "-";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const convertStudentRow = useCallback(
    (student: StudentRow): StudentWithGrades => {
      const sanitizedClassId = sanitizeClassId(student.class_id);
      const classInfo = sanitizedClassId ? classMap.get(normalizeClassId(sanitizedClassId)) : undefined;

      const semester145 = toNumberOrNull(student.academic_hk1_fortyfive);
      const semester1Exam = toNumberOrNull(student.academic_hk1_exam);
      const semester245 = toNumberOrNull(student.academic_hk2_fortyfive);
      const semester2Exam = toNumberOrNull(student.academic_hk2_exam);

      const catechismAverage = calculateCatechismAverage(semester145, semester1Exam, semester245, semester2Exam);

      // Use the new week-based attendance calculation
      const attendanceResult = attendanceScoresByStudent.get(student.id.trim());
      const weeksWithThursday = attendanceResult?.weeksWithThursday ?? 0;
      const weeksWithSunday = attendanceResult?.weeksWithSunday ?? 0;
      const attendanceAvg = attendanceResult?.score ?? null;

      // Calculate total score using utility function
      const totalAvg = calculateTotalScore(catechismAverage, attendanceAvg);

      const studentCode = student.student_code ?? student.code ?? "";
      const saintName = student.saint_name ?? "";
      const fullName = student.full_name ?? "";
      const parentPhone1 = student.parent_phone1 ?? student.parent_phone_1 ?? "";
      const parentPhone2 = student.parent_phone2 ?? student.parent_phone_2 ?? "";
      const address = student.address ?? "";
      const notes = student.notes ?? null;
      const phone = student.phone ?? "";
      const dateOfBirth = student.date_of_birth ?? "";

      const status = (student as { status?: StudentStatus | null }).status ?? "ACTIVE";
      const createdAt = (student as { created_at?: string | null }).created_at ?? "";
      const updatedAt = (student as { updated_at?: string | null }).updated_at ?? "";

      return {
        id: student.id,
        student_code: studentCode,
        class_id: sanitizedClassId,
        saint_name: saintName,
        full_name: fullName,
        date_of_birth: dateOfBirth,
        phone,
        parent_phone_1: parentPhone1,
        parent_phone_2: parentPhone2,
        address,
        notes,
        status,
        created_at: createdAt,
        updated_at: updatedAt,
        class_name: classInfo?.name ?? "Chưa phân lớp",
        sector: classInfo?.sector ?? "CHIÊN",
        grades: {
          semester_1_45min: semester145,
          semester_1_exam: semester1Exam,
          semester_2_45min: semester245,
          semester_2_exam: semester2Exam,
          catechism_avg: catechismAverage,
          attendance_avg: attendanceAvg,
          total_avg: totalAvg,
        },
        attendance_stats: {
          thursday_count: weeksWithThursday,
          sunday_count: weeksWithSunday,
          thursday_score: null, // No longer calculated separately
          sunday_score: null, // No longer calculated separately
          attendance_score: attendanceAvg,
        },
      };
    },
    [classMap, attendanceScoresByStudent],
  );

  // ID-based change detection thay vì JSON.stringify (performance improvement)
  const computeStudentListKey = useCallback((rows: StudentRow[]) => {
    if (!rows.length) return "";
    // Tạo key từ IDs để detect changes - đơn giản và nhanh hơn JSON.stringify
    const ids = rows.map((r) => r.id ?? "");
    ids.sort();
    return `${rows.length}|${ids.join(",")}`;
  }, []);

  useEffect(() => {
    if (!studentRows.length) {
      studentListSnapshotRef.current = "";
      setStudents((previous) => {
        if (!previous.length) {
          return previous;
        }
        return [];
      });
      return;
    }

    const nextKey = computeStudentListKey(studentRows);
    if (studentListSnapshotRef.current === nextKey) {
      return;
    }

    const transformed = studentRows
      .map(convertStudentRow)
      .sort((a, b) => {
        const nameComparison = nameCollator.compare(a.full_name, b.full_name);
        if (nameComparison !== 0) {
          return nameComparison;
        }
        return a.student_code.localeCompare(b.student_code);
      });

    studentListSnapshotRef.current = nextKey;
    setStudents(transformed);
  }, [studentRows, convertStudentRow, nameCollator, computeStudentListKey]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 4000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  const filteredStudents = useMemo(() => {
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        student.full_name.toLowerCase().includes(lowerSearch) ||
        student.student_code.toLowerCase().includes(lowerSearch);
      const matchesClass =
        !selectedClass || normalizeClassId(student.class_id) === normalizeClassId(selectedClass);
      const matchesStatus = statusFilter === "ALL" || student.status === statusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, debouncedSearchTerm, selectedClass, statusFilter]);

  const buildStudentMutationPayload = (): StudentInfoMutationPayload => {
    const trimmedStudentCode = formData.student_code.trim();
    const trimmedSaintName = formData.saint_name.trim();
    const trimmedFullName = formData.full_name.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedParentPhone1 = formData.parent_phone_1.trim();
    const trimmedParentPhone2 = formData.parent_phone_2.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedNotes = formData.notes.trim();

    return {
      code: trimmedStudentCode.length > 0 ? trimmedStudentCode : null,
      class_id: sanitizeClassId(formData.class_id) || null,
      saint_name: trimmedSaintName.length > 0 ? trimmedSaintName : null,
      full_name: trimmedFullName,
      date_of_birth: formData.date_of_birth || null,
      phone: trimmedPhone.length > 0 ? trimmedPhone : null,
      parent_phone1: trimmedParentPhone1.length > 0 ? trimmedParentPhone1 : null,
      parent_phone2: trimmedParentPhone2.length > 0 ? trimmedParentPhone2 : null,
      address: trimmedAddress.length > 0 ? trimmedAddress : null,
      notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      academic_hk1_fortyfive: parseGradeInput(formData.semester_1_45min),
      academic_hk1_exam: parseGradeInput(formData.semester_1_exam),
      academic_hk2_fortyfive: parseGradeInput(formData.semester_2_45min),
      academic_hk2_exam: parseGradeInput(formData.semester_2_exam),
    };
  };

  const handleSubmitStudentForm = async () => {
    if (isSavingInfo) {
      return;
    }

    setSuccessMessage(null);

    const trimmedFullName = formData.full_name.trim();
    if (!trimmedFullName) {
      setStudentSaveError("Vui lòng nhập họ và tên thiếu nhi.");
      return;
    }

    const payload = buildStudentMutationPayload();

    const invalidGrade = [
      payload.academic_hk1_fortyfive,
      payload.academic_hk1_exam,
      payload.academic_hk2_fortyfive,
      payload.academic_hk2_exam,
    ].find((value) => value !== null && (value < 0 || value > 10));

    if (invalidGrade !== undefined) {
      setStudentSaveError("Điểm phải nằm trong khoảng từ 0 đến 10.");
      return;
    }

    const mode: "create" | "update" = showCreateModal ? "create" : "update";

    if (mode === "update" && !selectedStudent) {
      setStudentSaveError("Không tìm thấy thiếu nhi để cập nhật.");
      return;
    }

    setStudentSaveError(null);
    setIsSavingStudent(true);

    try {
      const supabaseRow = await studentInfoMutation.mutateAsync({
        mode,
        id: mode === "update" ? selectedStudent?.id : undefined,
        payload,
      });

      const updatedStudent = convertStudentRow(supabaseRow);

      setStudents((current) => {
        if (mode === "create") {
          const next = [...current, updatedStudent];
          next.sort((a, b) => {
            const nameComparison = nameCollator.compare(a.full_name, b.full_name);
            if (nameComparison !== 0) {
              return nameComparison;
            }
            return a.student_code.localeCompare(b.student_code);
          });
          return next;
        }

        return current.map((student) => (student.id === updatedStudent.id ? updatedStudent : student));
      });

      await queryClient.invalidateQueries({ queryKey: ["students", "list"] });

      setSuccessMessage(
        mode === "create"
          ? "Thêm thiếu nhi thành công."
          : "Cập nhật thông tin thiếu nhi thành công.",
      );

      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedStudent(null);
      setFormData({
        student_code: "",
        class_id: defaultFormClassId,
        saint_name: "",
        full_name: "",
        date_of_birth: "",
        phone: "",
        parent_phone_1: "",
        parent_phone_2: "",
        address: "",
        notes: "",
        semester_1_45min: "",
        semester_1_exam: "",
        semester_2_45min: "",
        semester_2_exam: "",
      });
    } catch (error) {
      console.error("Failed to save student information:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Không thể lưu thông tin thiếu nhi lên Supabase. Vui lòng thử lại.";
      setStudentSaveError(message);
      setSuccessMessage(null);
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleCreate = () => {
    setStudentSaveError(null);
    setSelectedStudent(null);
    setFormData({
      student_code: "",
      class_id: defaultFormClassId,
      saint_name: "",
      full_name: "",
      date_of_birth: "",
      phone: "",
      parent_phone_1: "",
      parent_phone_2: "",
      address: "",
      notes: "",
      semester_1_45min: "",
      semester_1_exam: "",
      semester_2_45min: "",
      semester_2_exam: "",
    });
    setShowCreateModal(true);
  };

  const handleEditInfo = (student: StudentWithGrades) => {
    setStudentSaveError(null);
    setSelectedStudent(student);
    setFormData({
      student_code: student.student_code,
      class_id: sanitizeClassId(student.class_id),
      saint_name: student.saint_name || "",
      full_name: student.full_name,
      date_of_birth: student.date_of_birth,
      phone: student.phone || "",
      parent_phone_1: student.parent_phone_1 || "",
      parent_phone_2: student.parent_phone_2 || "",
      address: student.address || "",
      notes: student.notes || "",
      semester_1_45min: student.grades.semester_1_45min?.toString() || "",
      semester_1_exam: student.grades.semester_1_exam?.toString() || "",
      semester_2_45min: student.grades.semester_2_45min?.toString() || "",
      semester_2_exam: student.grades.semester_2_exam?.toString() || "",
    });
    setShowEditModal(true);
  };

  const handleEditGrades = (student: StudentWithGrades) => {
    setGradeSaveError(null);
    setEditingGradesId(student.id);
    setGradeEdits({
      semester_1_45min: student.grades.semester_1_45min?.toString() || "",
      semester_1_exam: student.grades.semester_1_exam?.toString() || "",
      semester_2_45min: student.grades.semester_2_45min?.toString() || "",
      semester_2_exam: student.grades.semester_2_exam?.toString() || "",
    });
  };

  const handleSaveGrades = async (studentId: string) => {
    if (gradeUpdateMutation.isPending) {
      return;
    }

    setSuccessMessage(null);

    const nextGrades = {
      semester_1_45min: parseGradeInput(gradeEdits.semester_1_45min),
      semester_1_exam: parseGradeInput(gradeEdits.semester_1_exam),
      semester_2_45min: parseGradeInput(gradeEdits.semester_2_45min),
      semester_2_exam: parseGradeInput(gradeEdits.semester_2_exam),
    };

    const invalidEntry = Object.values(nextGrades).find(
      (value) => value !== null && (value < 0 || value > 10),
    );

    if (invalidEntry !== undefined) {
      setGradeSaveError("Điểm phải nằm trong khoảng từ 0 đến 10.");
      return;
    }

    setGradeSaveError(null);
    setSavingGradesId(studentId);

    try {
      const targetStudent = students.find((student) => student.id === studentId);

      const persistedGrades = await gradeUpdateMutation.mutateAsync({
        studentId,
        updates: nextGrades,
      });

      setStudents((current) =>
        current.map((student) => {
          if (student.id !== studentId) {
            return student;
          }

          const appliedGrades: GradeMutationPayload = {
            semester_1_45min: persistedGrades.semester_1_45min,
            semester_1_exam: persistedGrades.semester_1_exam,
            semester_2_45min: persistedGrades.semester_2_45min,
            semester_2_exam: persistedGrades.semester_2_exam,
          };

          const catechismAvg = calculateCatechismAverage(
            appliedGrades.semester_1_45min,
            appliedGrades.semester_1_exam,
            appliedGrades.semester_2_45min,
            appliedGrades.semester_2_exam,
          );

          const attendanceAvg = student.grades.attendance_avg;
          const totalAvg =
            catechismAvg !== null || attendanceAvg !== null
              ? Number(((catechismAvg ?? 0) * 0.6 + (attendanceAvg ?? 0) * 0.4).toFixed(2))
              : null;

          return {
            ...student,
            grades: {
              ...student.grades,
              semester_1_45min: appliedGrades.semester_1_45min,
              semester_1_exam: appliedGrades.semester_1_exam,
              semester_2_45min: appliedGrades.semester_2_45min,
              semester_2_exam: appliedGrades.semester_2_exam,
              catechism_avg: catechismAvg,
              total_avg: totalAvg,
            },
          };
        }),
      );

      setSuccessMessage(
        targetStudent
          ? `Đã cập nhật điểm cho ${targetStudent.full_name}.`
          : "Đã cập nhật điểm thiếu nhi thành công.",
      );

      setEditingGradesId(null);
    } catch (error) {
      console.error("Failed to save student grades:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Không thể lưu điểm lên Supabase. Vui lòng thử lại.";
      setGradeSaveError(message);
      setSuccessMessage(null);
    } finally {
      setSavingGradesId(null);
    }
  };

  const handleDelete = (studentId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thiếu nhi này?")) {
      console.log("Deleting student:", studentId);
    }
  };

  const getClassName = (classId: string) => classMap.get(classId)?.name || "N/A";

  const predictedAvg = calculateCatechismAverage(
    formData.semester_1_45min ? parseFloat(formData.semester_1_45min) : null,
    formData.semester_1_exam ? parseFloat(formData.semester_1_exam) : null,
    formData.semester_2_45min ? parseFloat(formData.semester_2_45min) : null,
    formData.semester_2_exam ? parseFloat(formData.semester_2_exam) : null,
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Quản lý thiếu nhi</h2>
        <p className="text-sm text-slate-500">Theo dõi thông tin, điểm số và điểm danh của từng thiếu nhi.</p>
      </header>

      {/* Loading banner removed - replaced with skeleton table below */}

      {queryError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Không thể tải dữ liệu thiếu nhi: {queryError.message}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {studentSaveError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4" />
          {studentSaveError}
        </div>
      )}

      {gradeSaveError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4" />
          {gradeSaveError}
        </div>
      )}

      {isCatechist && !hasAssignedClass && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Bạn chưa được phân lớp. Vui lòng liên hệ quản trị để được cấp quyền trước khi quản lý thiếu nhi.
        </div>
      )}

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="relative xl:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã TN..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
            value={selectedClass}
            onChange={(e) => setSelectedClass(sanitizeClassId(e.target.value))}
            disabled={restrictClassSelection}
          >
            <option value="">{classFilterPlaceholder}</option>
            {classOptions.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StudentStatus | "ALL")}
          >
            <option value="ACTIVE">Đang học</option>
            <option value="DELETED">Đã xóa</option>
            <option value="ALL">Tất cả</option>
          </select>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </button>

          <Button onClick={handleCreate} className="flex items-center justify-center gap-2" fullWidth>
            <UserPlus className="h-4 w-4" />
            Thêm thiếu nhi
          </Button>
        </div>
      </Card>

      {isLoadingData && !students.length ? (
        <StudentTableSkeleton rows={10} />
      ) : (
        <>
          <div className="text-sm text-slate-600">
            Hiển thị {filteredStudents.length} / {students.length} thiếu nhi
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="p-3 text-left font-semibold text-slate-700">Thiếu nhi</th>
              <th className="p-3 text-left font-semibold text-slate-700">Lớp / Tuổi</th>
              <th className="p-3 text-left font-semibold text-slate-700">Liên hệ</th>
              <th className="p-3 text-center font-semibold text-slate-700">45p HK1</th>
              <th className="p-3 text-center font-semibold text-slate-700">Thi HK1</th>
              <th className="p-3 text-center font-semibold text-slate-700">45p HK2</th>
              <th className="p-3 text-center font-semibold text-slate-700">Thi HK2</th>
              <th className="p-3 text-center font-semibold text-slate-700">TB GL</th>
              <th className="p-3 text-center font-semibold text-slate-700">ĐD T5</th>
              <th className="p-3 text-center font-semibold text-slate-700">ĐD CN</th>
              <th className="p-3 text-center font-semibold text-slate-700">TB ĐD</th>
              <th className="p-3 text-center font-semibold text-slate-700">Tổng TB</th>
              <th className="p-3 text-center font-semibold text-slate-700">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const isEditingGrades = editingGradesId === student.id;
              const isSavingGrades = savingGradesId === student.id;
              const age = calculateAge(student.date_of_birth);
              return (
                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {student.saint_name ? `${student.saint_name} ` : ""}
                        {student.full_name}
                      </p>
                      <p className="text-xs text-slate-500">{student.student_code}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-slate-700">{getClassName(student.class_id)}</p>
                      <p className="text-xs text-slate-500">{typeof age === "number" ? `${age} tuổi` : "-"}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs text-slate-600">
                      {student.parent_phone_1 && <p>{student.parent_phone_1}</p>}
                      {student.parent_phone_2 && <p>{student.parent_phone_2}</p>}
                    </div>
                  </td>

                  {isEditingGrades ? (
                    <>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm text-slate-900"
                          value={gradeEdits.semester_1_45min}
                          onChange={(e) => setGradeEdits({ ...gradeEdits, semester_1_45min: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm text-slate-900"
                          value={gradeEdits.semester_1_exam}
                          onChange={(e) => setGradeEdits({ ...gradeEdits, semester_1_exam: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm text-slate-900"
                          value={gradeEdits.semester_2_45min}
                          onChange={(e) => setGradeEdits({ ...gradeEdits, semester_2_45min: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm text-slate-900"
                          value={gradeEdits.semester_2_exam}
                          onChange={(e) => setGradeEdits({ ...gradeEdits, semester_2_exam: e.target.value })}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-center text-slate-700">
                        {student.grades.semester_1_45min != null
                          ? student.grades.semester_1_45min.toFixed(1)
                          : "-"}
                      </td>
                      <td className="p-3 text-center text-slate-700">
                        {student.grades.semester_1_exam != null ? student.grades.semester_1_exam.toFixed(1) : "-"}
                      </td>
                      <td className="p-3 text-center text-slate-700">
                        {student.grades.semester_2_45min != null
                          ? student.grades.semester_2_45min.toFixed(1)
                          : "-"}
                      </td>
                      <td className="p-3 text-center text-slate-700">
                        {student.grades.semester_2_exam != null ? student.grades.semester_2_exam.toFixed(1) : "-"}
                      </td>
                    </>
                  )}

                  <td className="p-3 text-center font-semibold text-emerald-700">
                    {student.grades.catechism_avg != null ? student.grades.catechism_avg.toFixed(2) : "-"}
                  </td>
                  <td className="p-3 text-center text-slate-600">
                    {student.attendance_stats.thursday_score != null
                      ? student.attendance_stats.thursday_score.toFixed(1)
                      : "-"}
                    <span className="ml-1 text-xs text-slate-500">
                      ({student.attendance_stats.thursday_count})
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-600">
                    {student.attendance_stats.sunday_score != null
                      ? student.attendance_stats.sunday_score.toFixed(1)
                      : "-"}
                    <span className="ml-1 text-xs text-slate-500">
                      ({student.attendance_stats.sunday_count})
                    </span>
                  </td>
                  <td className="p-3 text-center font-semibold text-blue-700">
                    {student.grades.attendance_avg != null ? student.grades.attendance_avg.toFixed(2) : "-"}
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">
                    {student.grades.total_avg != null ? student.grades.total_avg.toFixed(2) : "-"}
                  </td>

                  <td className="p-3">
                    <div className="flex gap-1">
                      {isEditingGrades ? (
                        <>
                          <button
                            onClick={() => handleSaveGrades(student.id)}
                            disabled={isSavingGrades}
                            className={`rounded-md border border-emerald-600 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100 ${isSavingGrades ? "cursor-not-allowed opacity-60" : ""}`}
                            title="Lưu điểm"
                          >
                            {isSavingGrades ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (isSavingGrades) {
                                return;
                              }
                              setGradeSaveError(null);
                              setEditingGradesId(null);
                            }}
                            disabled={isSavingGrades}
                            className={`rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 ${isSavingGrades ? "cursor-not-allowed opacity-60" : ""}`}
                            title="Hủy"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditGrades(student)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
                            title="Sửa điểm"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditInfo(student)}
                            className="rounded-md border border-blue-300 bg-blue-50 p-1 text-blue-700 hover:bg-blue-100"
                            title="Sửa thông tin"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="rounded-md border border-red-300 bg-red-50 p-1 text-red-700 hover:bg-red-100"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        title={showCreateModal ? "Thêm thiếu nhi mới" : "Cập nhật thông tin thiếu nhi"}
        description="Điền đầy đủ thông tin và điểm số"
        size="xl"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800">Thông tin cơ bản</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Mã thiếu nhi"
                placeholder="TN2025001"
                value={formData.student_code}
                onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
              />
              <Select
                label="Lớp"
                options={[
                  { value: "", label: classSelectPlaceholder },
                  ...classOptions.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={formData.class_id}
                onChange={(e) =>
                  setFormData({ ...formData, class_id: sanitizeClassId(e.target.value) })
                }
                disabled={restrictClassSelection}
                helperText={classSelectHelperText}
              />
              <Input
                label="Tên thánh"
                placeholder="Phêrô"
                value={formData.saint_name}
                onChange={(e) => setFormData({ ...formData, saint_name: e.target.value })}
              />
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
              <Input
                label="Ngày sinh"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
              <Input
                label="SĐT thiếu nhi"
                placeholder="0912345678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="SĐT phụ huynh 1"
                placeholder="0912222222"
                value={formData.parent_phone_1}
                onChange={(e) => setFormData({ ...formData, parent_phone_1: e.target.value })}
              />
              <Input
                label="SĐT phụ huynh 2"
                placeholder="0913333333"
                value={formData.parent_phone_2}
                onChange={(e) => setFormData({ ...formData, parent_phone_2: e.target.value })}
              />
              <Input
                label="Địa chỉ"
                placeholder="Nhập địa chỉ"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="md:col-span-2"
              />
              <Input
                label="Ghi chú"
                placeholder="Ghi chú về thiếu nhi"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="md:col-span-2"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-slate-800">Điểm số giáo lý</h4>
            <div className="grid gap-4 md:grid-cols-4">
              <Input
                label="45 phút HK1"
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0.0"
                value={formData.semester_1_45min}
                onChange={(e) => setFormData({ ...formData, semester_1_45min: e.target.value })}
              />
              <Input
                label="Thi HK1 (x2)"
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0.0"
                value={formData.semester_1_exam}
                onChange={(e) => setFormData({ ...formData, semester_1_exam: e.target.value })}
              />
              <Input
                label="45 phút HK2"
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0.0"
                value={formData.semester_2_45min}
                onChange={(e) => setFormData({ ...formData, semester_2_45min: e.target.value })}
              />
              <Input
                label="Thi HK2 (x2)"
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0.0"
                value={formData.semester_2_exam}
                onChange={(e) => setFormData({ ...formData, semester_2_exam: e.target.value })}
              />
            </div>

            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Điểm trung bình (dự kiến):{" "}
                <span className="text-lg">{predictedAvg?.toFixed(2) || "Chưa có dữ liệu"}</span>
              </p>
              <p className="mt-2 text-xs text-blue-700">
                Công thức: (45p HK1 + 45p HK2 + Thi HK1 × 2 + Thi HK2 × 2) / 6
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-semibold">Lưu ý:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Điểm danh và điểm tổng sẽ được tự động tính dựa trên:</li>
                <li>Điểm điểm danh: từ việc điểm danh học kỳ 1 và học kỳ 2</li>
                <li>Điểm tổng: Điểm giáo lý × 0.6 + Điểm điểm danh × 0.4</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setStudentSaveError(null);
              setSelectedStudent(null);
            }}
          >
            Hủy
          </Button>
          <Button onClick={handleSubmitStudentForm} disabled={isSavingInfo}>
            {isSavingInfo ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </span>
            ) : showCreateModal ? (
              "Thêm"
            ) : (
              "Cập nhật"
            )}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import thiếu nhi từ Excel"
        description="Tải lên file Excel với danh sách thiếu nhi"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">Chọn file Excel để tải lên</p>
            <input type="file" accept=".xlsx,.xls" className="mt-4" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(false)}>
            Hủy
          </Button>
          <Button onClick={() => setShowImportModal(false)}>Tải lên</Button>
        </div>
      </Modal>
    </div>
  );
}
