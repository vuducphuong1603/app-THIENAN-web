"use client";

import { Edit, Save, Search, Trash2, Upload, UserPlus, X, Loader2, AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";
import type { Sector, StudentStatus, StudentWithGrades } from "@/types/database";
import { fetchClasses, fetchSectors, fetchStudents } from "@/lib/queries/supabase";
import type { ClassRow, SectorRow, StudentRow } from "@/lib/queries/supabase";

type StudentsPageProps = {
  initialSectors?: SectorRow[];
  initialClasses?: ClassRow[];
  initialStudents?: StudentRow[];
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

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

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function calculateAttendanceScore(present?: number | null, total?: number | null) {
  if (!present || !total || total === 0) return null;
  return Number(((present / total) * 10).toFixed(2));
}

function calculateAttendanceAverage(
  hk1Present?: number | null,
  hk1Total?: number | null,
  hk2Present?: number | null,
  hk2Total?: number | null,
) {
  const totalSessions = (hk1Total ?? 0) + (hk2Total ?? 0);
  const totalPresent = (hk1Present ?? 0) + (hk2Present ?? 0);
  if (totalSessions === 0) return null;
  return Number(((totalPresent / totalSessions) * 10).toFixed(2));
}

export default function StudentsPage({
  initialSectors,
  initialClasses,
  initialStudents,
}: StudentsPageProps) {
  const searchParams = useSearchParams();
  const classFilter = searchParams?.get("class") || "";
  const { supabase } = useAuth();

  const {
    data: sectorRows = [],
    isLoading: isLoadingSectors,
    error: sectorsError,
  } = useQuery<SectorRow[]>({
    queryKey: ["sectors", "list"],
    queryFn: () => fetchSectors(supabase),
    initialData: initialSectors,
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
  });

  const classOptions = useMemo(() => {
    return classRows
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
  }, [classRows, sectorById]);

  const classMap = useMemo(() => {
    const map = new Map<string, { name: string; sector: Sector }>();
    classOptions.forEach((cls) => {
      map.set(normalizeClassId(cls.id), { name: cls.name, sector: cls.sector });
    });
    return map;
  }, [classOptions]);

  const {
    data: studentRows = [],
    isLoading: isLoadingStudents,
    error: studentsError,
  } = useQuery<StudentRow[]>({
    queryKey: ["students", "list"],
    queryFn: () => fetchStudents(supabase),
    initialData: initialStudents,
  });

  const [students, setStudents] = useState<StudentWithGrades[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState(classFilter);
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "ALL">("ACTIVE");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithGrades | null>(null);
  const [editingGradesId, setEditingGradesId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    student_code: "",
    class_id: "",
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

  const isLoadingData = isLoadingSectors || isLoadingClasses || isLoadingStudents;
  const queryError =
    (sectorsError as Error | null) || (classesError as Error | null) || (studentsError as Error | null);

  useEffect(() => {
    if (!studentRows.length) {
      setStudents((previous) => {
        if (!previous.length) {
          return previous;
        }
        return [];
      });
      return;
    }

    const collator = new Intl.Collator("vi", { sensitivity: "base" });

    const transformed: StudentWithGrades[] = studentRows.map((student) => {
      const sanitizedClassId = sanitizeClassId(student.class_id);
      const classInfo = sanitizedClassId ? classMap.get(normalizeClassId(sanitizedClassId)) : undefined;

      const semester145 = toNumberOrNull(student.academic_hk1_fortyfive);
      const semester1Exam = toNumberOrNull(student.academic_hk1_exam);
      const semester245 = toNumberOrNull(student.academic_hk2_fortyfive);
      const semester2Exam = toNumberOrNull(student.academic_hk2_exam);

      const catechismAvg = calculateCatechismAvg(semester145, semester1Exam, semester245, semester2Exam);

      const hk1Present =
        toNumberOrNull(student.attendance_hk1_present) ??
        toNumberOrNull(student.attendance_thursday_present);
      const hk1Total =
        toNumberOrNull(student.attendance_hk1_total) ??
        toNumberOrNull(student.attendance_thursday_total);
      const hk2Present =
        toNumberOrNull(student.attendance_hk2_present) ??
        toNumberOrNull(student.attendance_sunday_present);
      const hk2Total =
        toNumberOrNull(student.attendance_hk2_total) ??
        toNumberOrNull(student.attendance_sunday_total);

      const attendanceThursdayScore = calculateAttendanceScore(
        hk1Present,
        hk1Total,
      );
      const attendanceSundayScore = calculateAttendanceScore(
        hk2Present,
        hk2Total,
      );
      const attendanceAvg = calculateAttendanceAverage(
        hk1Present,
        hk1Total,
        hk2Present,
        hk2Total,
      );

      const totalAvg =
        catechismAvg !== null || attendanceAvg !== null
          ? Number(((catechismAvg ?? 0) * 0.6 + (attendanceAvg ?? 0) * 0.4).toFixed(2))
          : null;

      const studentCode = student.student_code ?? student.code ?? "";
      const saintName = student.saint_name ?? "";
      const fullName = student.full_name ?? "";
      const parentPhone1 = student.parent_phone1 ?? student.parent_phone_1 ?? "";
      const parentPhone2 = student.parent_phone2 ?? student.parent_phone_2 ?? "";
      const address = student.address ?? "";
      const notes = student.notes ?? null;

      return {
        id: student.id,
        student_code: studentCode,
        class_id: sanitizedClassId,
        saint_name: saintName,
        full_name: fullName,
        date_of_birth: student.date_of_birth ?? "",
        phone: student.phone ?? "",
        parent_phone_1: parentPhone1,
        parent_phone_2: parentPhone2,
        address,
        notes,
        status: "ACTIVE",
        created_at: "",
        updated_at: "",
        class_name: classInfo?.name ?? "Chưa phân lớp",
        sector: classInfo?.sector ?? "CHIÊN",
        grades: {
          semester_1_45min: semester145,
          semester_1_exam: semester1Exam,
          semester_2_45min: semester245,
          semester_2_exam: semester2Exam,
          catechism_avg: catechismAvg,
          attendance_avg: attendanceAvg,
          total_avg: totalAvg,
        },
        attendance_stats: {
          thursday_count: hk1Present ?? 0,
          sunday_count: hk2Present ?? 0,
          thursday_score: attendanceThursdayScore,
          sunday_score: attendanceSundayScore,
          attendance_score: attendanceAvg,
        },
      };
    });

    transformed.sort((a, b) => {
      const nameComparison = collator.compare(a.full_name, b.full_name);
      if (nameComparison !== 0) {
        return nameComparison;
      }
      return a.student_code.localeCompare(b.student_code);
    });

    setStudents(transformed);
  }, [studentRows, classMap]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass =
      !selectedClass || normalizeClassId(student.class_id) === normalizeClassId(selectedClass);
    const matchesStatus = statusFilter === "ALL" || student.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

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

  const calculateCatechismAvg = (
    s1_45min?: number | null,
    s1_exam?: number | null,
    s2_45min?: number | null,
    s2_exam?: number | null,
  ): number | null => {
    if (s1_45min == null && s1_exam == null && s2_45min == null && s2_exam == null) {
      return null;
    }
    const sum = (s1_45min || 0) + (s2_45min || 0) + (s1_exam || 0) * 2 + (s2_exam || 0) * 2;
    return Number((sum / 6).toFixed(2));
  };

  const handleCreate = () => {
    setFormData({
      student_code: "",
      class_id: "",
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
    setSelectedStudent(student);
    setFormData({
      student_code: student.student_code,
      class_id: student.class_id,
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
    setEditingGradesId(student.id);
    setGradeEdits({
      semester_1_45min: student.grades.semester_1_45min?.toString() || "",
      semester_1_exam: student.grades.semester_1_exam?.toString() || "",
      semester_2_45min: student.grades.semester_2_45min?.toString() || "",
      semester_2_exam: student.grades.semester_2_exam?.toString() || "",
    });
  };

  const handleSaveGrades = (studentId: string) => {
    setStudents(
      students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              grades: {
                ...s.grades,
                semester_1_45min: gradeEdits.semester_1_45min ? parseFloat(gradeEdits.semester_1_45min) : null,
                semester_1_exam: gradeEdits.semester_1_exam ? parseFloat(gradeEdits.semester_1_exam) : null,
                semester_2_45min: gradeEdits.semester_2_45min ? parseFloat(gradeEdits.semester_2_45min) : null,
                semester_2_exam: gradeEdits.semester_2_exam ? parseFloat(gradeEdits.semester_2_exam) : null,
                catechism_avg: calculateCatechismAvg(
                  gradeEdits.semester_1_45min ? parseFloat(gradeEdits.semester_1_45min) : null,
                  gradeEdits.semester_1_exam ? parseFloat(gradeEdits.semester_1_exam) : null,
                  gradeEdits.semester_2_45min ? parseFloat(gradeEdits.semester_2_45min) : null,
                  gradeEdits.semester_2_exam ? parseFloat(gradeEdits.semester_2_exam) : null,
                ),
              },
            }
          : s,
      ),
    );
    setEditingGradesId(null);
  };

  const handleDelete = (studentId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thiếu nhi này?")) {
      console.log("Deleting student:", studentId);
    }
  };

  const getClassName = (classId: string) => classMap.get(classId)?.name || "N/A";

  const predictedAvg = calculateCatechismAvg(
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

      {isLoadingData && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Đang tải dữ liệu thiếu nhi từ Supabase...
        </div>
      )}

      {queryError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Không thể tải dữ liệu thiếu nhi: {queryError.message}
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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Tất cả lớp</option>
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
                    {student.attendance_stats.thursday_count} (
                    {student.attendance_stats.thursday_score?.toFixed(1) || "-"})
                  </td>
                  <td className="p-3 text-center text-slate-600">
                    {student.attendance_stats.sunday_count} (
                    {student.attendance_stats.sunday_score?.toFixed(1) || "-"})
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
                            className="rounded-md border border-emerald-600 bg-emerald-50 p-1 text-emerald-700 hover:bg-emerald-100"
                            title="Lưu điểm"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingGradesId(null)}
                            className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-100"
                            title="Hủy"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditGrades(student)}
                            className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-100"
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
                  { value: "", label: "Chọn lớp" },
                  ...classOptions.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
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
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
            }}
          >
            {showCreateModal ? "Thêm" : "Cập nhật"}
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
