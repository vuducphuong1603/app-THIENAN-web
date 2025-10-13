"use client";

import { Plus, Search, Trash2, Users, Eye, Loader2, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { ClassWithTeachers, Sector, TeacherAssignment } from "@/types/database";
import { useAuth } from "@/providers/auth-provider";
import { fetchClasses, fetchSectors, fetchStudentClassPairs, fetchTeachers } from "@/lib/queries/supabase";
import type { ClassRow, SectorRow, StudentClassRow, TeacherRow } from "@/lib/queries/supabase";

type ClassesPageProps = {
  initialClasses?: ClassRow[];
  initialSectors?: SectorRow[];
  initialTeachers?: TeacherRow[];
  initialStudentClassPairs?: StudentClassRow[];
};

type AvailableTeacher = {
  id: string;
  saint_name: string | null;
  full_name: string;
  phone: string;
  current_class: string | null;
  is_primary: boolean;
};

type UpdateClassPayload = {
  classId: string;
  name: string;
  sector: Sector;
  assignedTeachers: TeacherAssignment[];
  previousTeachers: TeacherAssignment[];
  displayName: string;
};

const SECTOR_CODE_TO_LABEL: Record<string, Sector> = {
  CHIEN: "CHIÊN",
  AU: "ẤU",
  THIEU: "THIẾU",
  NGHIA: "NGHĨA",
};

const SECTOR_LABELS: Record<Sector, string> = {
  "CHIÊN": "Chiên",
  "ẤU": "Ấu",
  "THIẾU": "Thiếu",
  "NGHĨA": "Nghĩa",
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

function resolveTeacherName(teacher: TeacherRow) {
  if (teacher.full_name) return teacher.full_name;
  const parts = [teacher.last_name, teacher.first_name].filter(Boolean);
  return parts.join(" ").trim();
}

export default function ClassesPage({
  initialClasses,
  initialSectors,
  initialTeachers,
  initialStudentClassPairs,
}: ClassesPageProps) {
  const router = useRouter();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: classRows = [],
    isLoading: isLoadingClasses,
    error: classesError,
  } = useQuery<ClassRow[]>({
    queryKey: ["classes", "list"],
    queryFn: () => fetchClasses(supabase),
    initialData: initialClasses,
  });

  const {
    data: sectorRows = [],
    isLoading: isLoadingSectors,
    error: sectorsError,
  } = useQuery<SectorRow[]>({
    queryKey: ["sectors", "list"],
    queryFn: () => fetchSectors(supabase),
    initialData: initialSectors,
  });

  const {
    data: teacherRows = [],
    isLoading: isLoadingTeachers,
    error: teachersError,
  } = useQuery<TeacherRow[]>({
    queryKey: ["teachers", "list"],
    queryFn: () => fetchTeachers(supabase),
    initialData: initialTeachers,
  });

  const {
    data: studentRows = [],
    isLoading: isLoadingStudents,
    error: studentsError,
  } = useQuery<StudentClassRow[]>({
    queryKey: ["students", "classCounts"],
    queryFn: () => fetchStudentClassPairs(supabase),
    initialData: initialStudentClassPairs,
  });

  const { classes, availableTeachers } = useMemo(() => {
    const classNameById = new Map<string, string>();
    classRows.forEach((cls) => {
      const trimmedName = cls.name?.trim();
      const trimmedCode = cls.code?.toString().trim();
      const displayName =
        (trimmedName && trimmedName.length > 0 ? trimmedName : null) ??
        (trimmedCode && trimmedCode.length > 0 ? trimmedCode : null) ??
        cls.id;
      classNameById.set(cls.id, displayName);
    });

    const sortedTeachers = [...teacherRows].sort((a, b) =>
      resolveTeacherName(a).localeCompare(resolveTeacherName(b)),
    );

    const resolvedAvailableTeachers: AvailableTeacher[] = sortedTeachers.map((teacher) => {
      const mappedClassName =
        teacher.class_name ??
        (teacher.class_id ? classNameById.get(teacher.class_id) ?? null : null) ??
        (teacher.class_code ?? null);

      return {
        id: teacher.id,
        saint_name: teacher.saint_name,
        full_name: resolveTeacherName(teacher),
        phone: teacher.phone ?? "",
        current_class: mappedClassName,
        is_primary: false,
      };
    });

    if (!classRows.length) {
      return { classes: [] as ClassWithTeachers[], availableTeachers: resolvedAvailableTeachers };
    }

    const sectorById = new Map<number, Sector>();
    sectorRows.forEach((sector) => {
      sectorById.set(sector.id, mapSector(sector.code, sector.name));
    });

    const classStudentCount = new Map<string, number>();
    studentRows.forEach((student) => {
      if (!student.class_id) return;
      classStudentCount.set(student.class_id, (classStudentCount.get(student.class_id) ?? 0) + 1);
    });

    const teacherMapByClassId = new Map<string, TeacherRow[]>();
    const teacherMapByKey = new Map<string, TeacherRow[]>();

    sortedTeachers.forEach((teacher) => {
      if (teacher.class_id) {
        const key = teacher.class_id;
        if (!teacherMapByClassId.has(key)) {
          teacherMapByClassId.set(key, []);
        }
        teacherMapByClassId.get(key)!.push(teacher);
      }

      const keys = new Set<string>();
      if (teacher.class_name) {
        keys.add(normalizeText(teacher.class_name));
      }
      if (teacher.class_code) {
        keys.add(normalizeText(teacher.class_code));
      }
      if (teacher.class_id) {
        keys.add(normalizeText(teacher.class_id));
      }

      keys.forEach((key) => {
        if (!key) return;
        if (!teacherMapByKey.has(key)) {
          teacherMapByKey.set(key, []);
        }
        teacherMapByKey.get(key)!.push(teacher);
      });
    });

    const sectorOrder: Record<Sector, number> = {
      "CHIÊN": 0,
      "ẤU": 1,
      "THIẾU": 2,
      "NGHĨA": 3,
    };

    const classesWithTeachers: ClassWithTeachers[] = classRows.map((cls) => {
      const displayName = classNameById.get(cls.id) ?? cls.id;

      const sectorFromMap =
        typeof cls.sector_id === "number" && cls.sector_id !== null
          ? sectorById.get(cls.sector_id)
          : undefined;

      const sector = sectorFromMap
        ?? resolveSectorFromCandidates(
          cls.sector_code,
          cls.sector_name,
          cls.sector,
          cls.branch_code,
          cls.branch_name,
          cls.branch,
          cls.name,
          cls.code,
        );

      const matchingKeys = new Set<string>();
      if (cls.name) {
        matchingKeys.add(normalizeText(cls.name));
      }
      if (cls.code) {
        matchingKeys.add(normalizeText(cls.code));
      }
      matchingKeys.add(normalizeText(cls.id));

      const matchedTeacherIds = new Set<string>();
      const orderedTeachers: TeacherRow[] = [];

      const directMatches = teacherMapByClassId.get(cls.id) ?? [];
      directMatches.forEach((teacher) => {
        if (teacher.id && !matchedTeacherIds.has(teacher.id)) {
          matchedTeacherIds.add(teacher.id);
          orderedTeachers.push(teacher);
        }
      });

      const fuzzyMatches: TeacherRow[] = [];
      matchingKeys.forEach((key) => {
        if (!key) return;
        const teachersForKey = teacherMapByKey.get(key) ?? [];
        teachersForKey.forEach((teacher) => {
          if (teacher.id && !matchedTeacherIds.has(teacher.id)) {
            matchedTeacherIds.add(teacher.id);
            fuzzyMatches.push(teacher);
          }
        });
      });

      fuzzyMatches.sort((a, b) => resolveTeacherName(a).localeCompare(resolveTeacherName(b)));
      orderedTeachers.push(...fuzzyMatches);

      const teacherAssignments: TeacherAssignment[] = orderedTeachers.map((teacher, index) => ({
        id: `${teacher.id}-${cls.id}`,
        class_id: cls.id,
        teacher_id: teacher.id,
        is_primary: index === 0,
        teacher: {
          id: teacher.id,
          saint_name: teacher.saint_name,
          full_name: resolveTeacherName(teacher),
          phone: teacher.phone ?? "",
        },
      }));

      return {
        id: cls.id,
        name: displayName,
        sector,
        created_at: "",
        updated_at: "",
        student_count: classStudentCount.get(cls.id) ?? 0,
        teachers: teacherAssignments,
      };
    });

    const sortedClasses = classesWithTeachers.sort((a, b) => {
      const sectorDiff = sectorOrder[a.sector] - sectorOrder[b.sector];
      if (sectorDiff !== 0) {
        return sectorDiff;
      }
      return a.name.localeCompare(b.name);
    });

    return { classes: sortedClasses, availableTeachers: resolvedAvailableTeachers };
  }, [classRows, sectorRows, studentRows, teacherRows]);

  const teacherLookupById = useMemo(() => {
    const map = new Map<string, TeacherRow>();
    teacherRows.forEach((teacher) => {
      if (teacher.id) {
        map.set(teacher.id, teacher);
      }
    });
    return map;
  }, [teacherRows]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithTeachers | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sector: "" as Sector | "",
  });

  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
  const [assignedTeachers, setAssignedTeachers] = useState<TeacherAssignment[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const sectors: Sector[] = ["CHIÊN", "ẤU", "THIẾU", "NGHĨA"];

  const isLoadingData = isLoadingClasses || isLoadingSectors || isLoadingTeachers || isLoadingStudents;
  const queryError =
    (classesError as Error | null) ||
    (sectorsError as Error | null) ||
    (teachersError as Error | null) ||
    (studentsError as Error | null);

  const filteredClasses = classes.filter((cls) => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = !sectorFilter || cls.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const groupedClasses = sectors.map((sector) => ({
    sector,
    classes: filteredClasses.filter((cls) => cls.sector === sector),
  })).filter((group) => group.classes.length > 0);

  const totalClasses = filteredClasses.length;
  const totalStudents = filteredClasses.reduce((sum, cls) => sum + cls.student_count, 0);

  const handleCreate = () => {
    setFormData({ name: "", sector: "" });
    setShowCreateModal(true);
  };

  const handleEdit = (classItem: ClassWithTeachers) => {
    setSelectedClass(classItem);
    setFormData({
      name: classItem.name,
      sector: classItem.sector,
    });
    setAssignedTeachers(
      classItem.teachers.map((assignment) => ({
        ...assignment,
        teacher: { ...assignment.teacher },
      })),
    );
    setTeacherSearchTerm("");
    setFormError(null);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedClass(null);
    setTeacherSearchTerm("");
    setAssignedTeachers([]);
    setFormError(null);
    setFormData({ name: "", sector: "" as Sector | "" });
  };

  const handleViewStudents = (classItem: ClassWithTeachers) => {
    // Navigate to students page with class filter
    router.push(`/students?class=${classItem.id}`);
  };

  const handleDelete = (classId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa lớp này?")) {
      console.log("Deleting class:", classId);
    }
  };

  const handleAssignTeacher = (teacher: typeof availableTeachers[0], isPrimary: boolean) => {
    if (!selectedClass) return;
    if (updateClassMutation.isPending) return;
    setFormError(null);
    const newAssignment: TeacherAssignment = {
      id: `${teacher.id}-${selectedClass.id}`,
      class_id: selectedClass.id,
      teacher_id: teacher.id,
      is_primary: isPrimary,
      teacher: {
        id: teacher.id,
        saint_name: teacher.saint_name,
        full_name: teacher.full_name,
        phone: teacher.phone,
      },
    };
    setAssignedTeachers((prev) => [...prev, newAssignment]);
  };

  const handleRemoveTeacher = (assignmentId: string) => {
    if (updateClassMutation.isPending) return;
    setFormError(null);
    setAssignedTeachers((prev) => prev.filter((ta) => ta.id !== assignmentId));
  };

  const updateClassMutation = useMutation<void, Error, UpdateClassPayload>({
    mutationFn: async ({
      classId,
      name,
      sector,
      assignedTeachers: nextTeachers,
      previousTeachers,
      displayName,
    }) => {
      const trimmedName = name.trim();
      const classUpdates: Record<string, unknown> = {};

      if (trimmedName.length > 0) {
        classUpdates.name = trimmedName;
      }

      if (sector) {
        classUpdates.sector = sector;
      }

      if (Object.keys(classUpdates).length > 0) {
        classUpdates.updated_at = new Date().toISOString();
        const { error: classError } = await supabase
          .from("classes")
          .update(classUpdates)
          .eq("id", classId);

        if (classError) {
          console.error("Supabase class update failed:", classError);
          throw new Error(`Không thể cập nhật lớp trong Supabase: ${classError.message}`);
        }
      }

      const classRow = classRows.find((cls) => cls.id === classId);
      const resolvedClassName =
        trimmedName ||
        classRow?.name?.trim() ||
        (classRow?.code ? String(classRow.code).trim() : "") ||
        displayName ||
        classId;
      const resolvedClassCode =
        classRow?.code !== undefined && classRow?.code !== null
          ? String(classRow.code).trim()
          : classId;
      const sectorLabel = SECTOR_LABELS[sector] ?? sector;
      const timestamp = new Date().toISOString();

      const safelyUpdateTeacher = async (
        teacherId: string,
        payload: Record<string, unknown>,
        failureMessage: string,
      ): Promise<TeacherRow | null> => {
        const teacherRecord = teacherLookupById.get(teacherId) ?? null;
        const identifiers: Array<{ column: "id" | "phone"; value: string }> = [];

        if (teacherRecord?.id) {
          identifiers.push({ column: "id", value: teacherRecord.id });
        }

        const phone = teacherRecord?.phone?.trim();
        if (phone) {
          identifiers.push({ column: "phone", value: phone });
        }

        if (!identifiers.some((identifier) => identifier.column === "id") && teacherId) {
          identifiers.push({ column: "id", value: teacherId });
        }

        if (identifiers.length === 0) {
          throw new Error(
            `${failureMessage}: Không có thông tin (id/phone) để xác định giáo lý viên.`,
          );
        }

        let lastError: PostgrestError | null = null;

        for (const identifier of identifiers) {
          const { data, error } = await supabase
            .from("teachers")
            .update(payload)
            .eq(identifier.column, identifier.value)
            .select("id")
            .limit(1);

          if (error) {
            lastError = error;
            continue;
          }

          if (Array.isArray(data) && data.length > 0) {
            return teacherRecord;
          }
        }

        if (lastError) {
          console.error("Supabase teacher update failed:", lastError);
          throw new Error(`${failureMessage}: ${lastError.message}`);
        }

        throw new Error(
          `${failureMessage}: Không tìm thấy giáo lý viên với ${identifiers
            .map((identifier) => `${identifier.column}=${identifier.value}`)
            .join(" hoặc ")}.`,
        );
      };

      const previousIds = new Set(previousTeachers.map((teacher) => teacher.teacher_id));
      const nextIds = new Set(nextTeachers.map((teacher) => teacher.teacher_id));
      const removedIds = Array.from(previousIds).filter((id) => !nextIds.has(id));

      for (const teacherId of removedIds) {
        await safelyUpdateTeacher(
          teacherId,
          {
            class_id: null,
            class_name: null,
            class_code: null,
            sector: null,
            updated_at: timestamp,
          },
          "Không thể gỡ giáo lý viên khỏi lớp",
        );
      }

      for (const assignment of nextTeachers) {
        await safelyUpdateTeacher(
          assignment.teacher_id,
          {
            class_id: classId,
            class_name: resolvedClassName,
            class_code: resolvedClassCode,
            sector: sectorLabel,
            updated_at: timestamp,
          },
          "Không thể đồng bộ giáo lý viên tới lớp",
        );
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["classes", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["teachers", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["students", "classCounts"] }),
      ]);
    },
  });

  const handleUpdate = () => {
    if (!selectedClass) {
      return;
    }

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError("Vui lòng nhập tên lớp.");
      return;
    }

    if (!formData.sector) {
      setFormError("Vui lòng chọn ngành.");
      return;
    }

    setFormError(null);

    updateClassMutation.mutate(
      {
        classId: selectedClass.id,
        name: trimmedName,
        sector: formData.sector,
        assignedTeachers,
        previousTeachers: selectedClass.teachers,
        displayName: selectedClass.name,
      },
      {
        onSuccess: () => {
          setFormData({ name: "", sector: "" as Sector | "" });
          setAssignedTeachers([]);
          setTeacherSearchTerm("");
          setSelectedClass(null);
          setShowEditModal(false);
        },
        onError: (error) => {
          setFormError(
            error instanceof Error ? error.message : "Không thể cập nhật lớp. Vui lòng thử lại.",
          );
        },
      },
    );
  };

  const filteredAvailableTeachers = availableTeachers.filter(
    (teacher) =>
      teacher.full_name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) &&
      !assignedTeachers.some((ta) => ta.teacher_id === teacher.id),
  );

  const getTeacherName = (teacher: { saint_name?: string | null; full_name: string }) => {
    return teacher.saint_name ? `${teacher.saint_name} ${teacher.full_name}` : teacher.full_name;
  };

  const getPrimaryTeacher = (teachers: TeacherAssignment[]) => {
    const primary = teachers.find((t) => t.is_primary);
    return primary ? getTeacherName(primary.teacher) : "Chưa phân công";
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Quản lý lớp học</h2>
        <p className="text-sm text-slate-500">Xem tổng quan, chỉnh sửa và phân công giáo lý viên.</p>
      </header>

      {isLoadingData && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Đang tải dữ liệu lớp học từ Supabase...
        </div>
      )}

      {queryError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Không thể tải dữ liệu lớp học: {queryError.message}
        </div>
      )}

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm lớp..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            <option value="">Tất cả ngành</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>
                Ngành {sector}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="font-medium">Số lớp: {totalClasses}</span>
            <span className="font-medium">Thiếu nhi: {totalStudents}</span>
          </div>

          <Button onClick={handleCreate} className="flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            Thêm lớp
          </Button>
        </div>
      </Card>

      <section className="space-y-4">
        {groupedClasses.map((group) => (
          <Card key={group.sector}>
            <CardHeader
              title={`Ngành ${group.sector}`}
              description={`Số lớp: ${group.classes.length}`}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.classes.map((classItem) => {
                const assistants = classItem.teachers.filter((t) => !t.is_primary);

                return (
                  <div key={classItem.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between">
                      <h4 className="text-base font-semibold text-slate-800">{classItem.name}</h4>
                      <span className="flex items-center gap-1 text-sm text-slate-500">
                        <Users className="h-4 w-4" />
                        {classItem.student_count}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p className="font-medium text-slate-700">{getPrimaryTeacher(classItem.teachers)}</p>
                      <div className="space-y-0.5">
                        {assistants.length > 0 ? (
                          assistants.map((assistant) => (
                            <p key={assistant.id} className="font-medium text-slate-700">
                              {getTeacherName(assistant.teacher)}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">Chưa phân công</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewStudents(classItem)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Xem
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(classItem)}
                        fullWidth
                      >
                        Chỉnh sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(classItem.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </section>

      {/* Create Class Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Thêm lớp mới"
        description="Tạo lớp học mới cho năm học hiện tại"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Tên lớp"
            placeholder="Ví dụ: Chiên 1, Ấu 2..."
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Select
            label="Ngành"
            options={[
              { value: "", label: "Chọn ngành" },
              ...sectors.map((s) => ({ value: s, label: `Ngành ${s}` })),
            ]}
            value={formData.sector}
            onChange={(e) => setFormData({ ...formData, sector: e.target.value as Sector | "" })}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            Hủy
          </Button>
          <Button onClick={() => setShowCreateModal(false)}>Tạo mới</Button>
        </div>
      </Modal>

      {/* Edit Class Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        title="Chỉnh sửa lớp"
        description="Cập nhật thông tin lớp và phân công giáo lý viên"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Tên lớp"
              placeholder="Tên lớp"
              value={formData.name}
              onChange={(e) => {
                setFormError(null);
                setFormData({ ...formData, name: e.target.value });
              }}
            />
            <Select
              label="Ngành"
              options={[
                { value: "", label: "Chọn ngành" },
                ...sectors.map((s) => ({ value: s, label: `Ngành ${s}` })),
              ]}
              value={formData.sector}
              onChange={(e) => {
                setFormError(null);
                setFormData({ ...formData, sector: e.target.value as Sector | "" });
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Phân công giáo lý viên</label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm giáo lý viên..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={teacherSearchTerm}
                onChange={(e) => setTeacherSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700">Giáo lý viên đã phân công</p>
              {assignedTeachers.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Chưa có giáo lý viên</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {assignedTeachers.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="flex items-center justify-between rounded-md bg-slate-50 p-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {getTeacherName(assignment.teacher)}
                        </p>
                        <p
                          className={clsx(
                            "text-xs font-semibold",
                            assignment.is_primary ? "text-emerald-600" : "text-sky-600",
                          )}
                        >
                          {assignment.is_primary ? "Chính" : "Phụ"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveTeacher(assignment.id)}
                        disabled={updateClassMutation.isPending}
                        className="text-xs text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Gỡ bỏ
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700">Giáo lý viên khả dụng</p>
              {filteredAvailableTeachers.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Không có giáo lý viên khả dụng</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {filteredAvailableTeachers.map((teacher) => (
                    <li
                      key={teacher.id}
                      className="flex items-center justify-between rounded-md bg-slate-50 p-2 text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{getTeacherName(teacher)}</p>
                        <p className="text-xs text-slate-500">
                          {teacher.current_class ? (
                            <>
                              Đang{" "}
                              <span
                                className={clsx(
                                  "font-semibold",
                                  teacher.is_primary ? "text-emerald-600" : "text-sky-600",
                                )}
                              >
                                {teacher.is_primary ? "chính" : "phụ"}
                              </span>{" "}
                              {teacher.current_class}
                            </>
                          ) : (
                            "Chưa có lớp"
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAssignTeacher(teacher, true)}
                          disabled={updateClassMutation.isPending}
                          className={clsx(
                            "rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                            "border-emerald-500 text-emerald-600 hover:bg-emerald-50",
                            "disabled:cursor-not-allowed disabled:opacity-60",
                          )}
                        >
                          Chính
                        </button>
                        <button
                          onClick={() => handleAssignTeacher(teacher, false)}
                          disabled={updateClassMutation.isPending}
                          className={clsx(
                            "rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                            "border-sky-500 text-sky-600 hover:bg-sky-50",
                            "disabled:cursor-not-allowed disabled:opacity-60",
                          )}
                        >
                          Phụ
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {formError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCloseEditModal}
            disabled={updateClassMutation.isPending}
          >
            Hủy
          </Button>
          <Button onClick={handleUpdate} disabled={updateClassMutation.isPending}>
            {updateClassMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang cập nhật...
              </span>
            ) : (
              "Cập nhật"
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
