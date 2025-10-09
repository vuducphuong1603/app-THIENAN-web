"use client";

import { Plus, Search, Trash2, Users, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { ClassWithTeachers, Sector, TeacherAssignment } from "@/types/database";

// Mock data - replace with actual API calls
const mockClasses: ClassWithTeachers[] = [
  {
    id: "class-1",
    name: "Chiên 1",
    sector: "CHIÊN",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    student_count: 28,
    teachers: [
      {
        id: "ta-1",
        class_id: "class-1",
        teacher_id: "teacher-1",
        is_primary: true,
        teacher: {
          id: "teacher-1",
          saint_name: "Phêrô",
          full_name: "Nguyễn Văn C",
          phone: "0901234567",
        },
      },
    ],
  },
  {
    id: "class-2",
    name: "Chiên 2",
    sector: "CHIÊN",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    student_count: 27,
    teachers: [
      {
        id: "ta-2",
        class_id: "class-2",
        teacher_id: "teacher-2",
        is_primary: true,
        teacher: {
          id: "teacher-2",
          saint_name: "Maria",
          full_name: "Lê Thị D",
          phone: "0902345678",
        },
      },
    ],
  },
  {
    id: "class-3",
    name: "Ấu 1",
    sector: "ẤU",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    student_count: 30,
    teachers: [
      {
        id: "ta-3",
        class_id: "class-3",
        teacher_id: "teacher-3",
        is_primary: true,
        teacher: {
          id: "teacher-3",
          saint_name: "Giuse",
          full_name: "Nguyễn Văn E",
          phone: "0903456789",
        },
      },
    ],
  },
];

const availableTeachers = [
  {
    id: "teacher-4",
    saint_name: "Anna",
    full_name: "Võ Thị F",
    phone: "0904567890",
    current_class: "Chiên 1",
    is_primary: false,
  },
  {
    id: "teacher-5",
    saint_name: "Têrêsa",
    full_name: "Trần Thị G",
    phone: "0905678901",
    current_class: null,
    is_primary: false,
  },
];

export default function ClassesPage() {
  const router = useRouter();
  const [classes] = useState<ClassWithTeachers[]>(mockClasses);
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

  const sectors: Sector[] = ["CHIÊN", "ẤU", "THIẾU", "NGHĨA"];

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
    setAssignedTeachers(classItem.teachers);
    setShowEditModal(true);
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
    const newAssignment: TeacherAssignment = {
      id: `ta-new-${Date.now()}`,
      class_id: selectedClass?.id || "",
      teacher_id: teacher.id,
      is_primary: isPrimary,
      teacher: {
        id: teacher.id,
        saint_name: teacher.saint_name,
        full_name: teacher.full_name,
        phone: teacher.phone,
      },
    };
    setAssignedTeachers([...assignedTeachers, newAssignment]);
  };

  const handleRemoveTeacher = (assignmentId: string) => {
    setAssignedTeachers(assignedTeachers.filter((ta) => ta.id !== assignmentId));
  };

  const filteredAvailableTeachers = availableTeachers.filter(
    (teacher) =>
      teacher.full_name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) &&
      !assignedTeachers.some((ta) => ta.teacher_id === teacher.id),
  );

  const getTeacherName = (teacher: { saint_name?: string | null; full_name: string }) => {
    return teacher.saint_name ? `Th. ${teacher.saint_name} ${teacher.full_name}` : teacher.full_name;
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

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm lớp..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              {group.classes.map((classItem) => (
                <div key={classItem.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between">
                    <h4 className="text-base font-semibold text-slate-800">{classItem.name}</h4>
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <Users className="h-4 w-4" />
                      {classItem.student_count}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p>
                      <span className="font-medium">Giáo lý viên:</span>
                    </p>
                    <p className="text-xs">{getPrimaryTeacher(classItem.teachers)}</p>
                    {classItem.teachers.filter((t) => !t.is_primary).length > 0 && (
                      <p className="text-xs text-slate-500">
                        + {classItem.teachers.filter((t) => !t.is_primary).length} phụ
                      </p>
                    )}
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
              ))}
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
            onChange={(e) => setFormData({ ...formData, sector: e.target.value as Sector })}
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
        onClose={() => setShowEditModal(false)}
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Select
              label="Ngành"
              options={[
                { value: "", label: "Chọn ngành" },
                ...sectors.map((s) => ({ value: s, label: `Ngành ${s}` })),
              ]}
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value as Sector })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Phân công giáo lý viên</label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm giáo lý viên..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                        <p className="text-xs text-slate-500">
                          {assignment.is_primary ? "Chính" : "Phụ"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveTeacher(assignment.id)}
                        className="text-xs text-red-600 hover:text-red-700"
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
                          {teacher.current_class
                            ? `Đang ${teacher.is_primary ? "chính" : "phụ"} ${teacher.current_class}`
                            : "Chưa có lớp"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAssignTeacher(teacher, true)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Chính
                        </button>
                        <button
                          onClick={() => handleAssignTeacher(teacher, false)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
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

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
            Hủy
          </Button>
          <Button onClick={() => setShowEditModal(false)}>Cập nhật</Button>
        </div>
      </Modal>
    </div>
  );
}
