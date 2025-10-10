"use client";

import { Search, Upload, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { Sector } from "@/types/database";
import {
  fetchUsers,
  createUser,
  updateUser,
  updateUserStatus,
  type UserWithTeacherData,
} from "@/lib/actions/users";
import { fetchClasses } from "@/lib/actions/classes";
import { getRoleLabel } from "@/lib/auth/roles";

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithTeacherData[]>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string; sector: Sector }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithTeacherData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "",
    saint_name: "",
    full_name: "",
    date_of_birth: "",
    phone: "",
    address: "",
    sector: "" as Sector | "",
    class_id: "",
  });

  const sectors: Sector[] = ["CHIÊN", "ẤU", "THIẾU", "NGHĨA"];

  const roles = [
    { value: "admin", label: "Ban điều hành" },
    { value: "phan_doan_truong", label: "Phân đoàn trưởng" },
    { value: "giao_ly_vien", label: "Giáo lý viên" },
  ];

  // Load users and classes on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersResult, classesResult] = await Promise.all([
        fetchUsers(),
        fetchClasses(),
      ]);

      if (usersResult.data) {
        setUsers(usersResult.data);
      }

      if (classesResult.data) {
        setClasses(classesResult.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm));
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesSector = !sectorFilter || user.teacher_sector === sectorFilter;
    const matchesClass = !classFilter || user.teacher_class_id === classFilter;

    return matchesSearch && matchesRole && matchesSector && matchesClass;
  });

  const filteredClasses = classes.filter((c) => !sectorFilter || c.sector === sectorFilter);

  const handleClearFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setSectorFilter("");
    setClassFilter("");
  };

  const handleCreate = () => {
    setFormData({
      username: "",
      password: "",
      role: "",
      saint_name: "",
      full_name: "",
      date_of_birth: "",
      phone: "",
      address: "",
      sector: "",
      class_id: "",
    });
    setShowCreateModal(true);
  };

  const handleEdit = (user: UserWithTeacherData) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      saint_name: user.saint_name || "",
      full_name: user.full_name,
      date_of_birth: user.date_of_birth || "",
      phone: user.phone || "",
      address: user.address || "",
      sector: (user.teacher_sector as Sector) || "",
      class_id: user.teacher_class_id || "",
    });
    setShowEditModal(true);
  };

  const handleSubmitCreate = async () => {
    if (!formData.phone || !formData.password || !formData.full_name || !formData.role) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createUser({
        username: formData.phone, // Use phone as username
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
        saint_name: formData.saint_name,
        full_name: formData.full_name,
        date_of_birth: formData.date_of_birth,
        address: formData.address,
        sector: formData.sector || undefined,
        class_id: formData.class_id || undefined,
      });

      if (result.error) {
        alert(`Lỗi: ${result.error}`);
        return;
      }

      alert("Thêm người dùng thành công!");
      setShowCreateModal(false);
      await loadData(); // Reload users
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Có lỗi xảy ra khi tạo người dùng");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const result = await updateUser(selectedUser.id, {
        role: formData.role || undefined,
        saint_name: formData.saint_name || undefined,
        full_name: formData.full_name || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        sector: formData.sector || undefined,
        class_id: formData.class_id || undefined,
        password: formData.password || undefined,
      });

      if (result.error) {
        alert(`Lỗi: ${result.error}`);
        return;
      }

      alert("Cập nhật thông tin thành công!");
      setShowEditModal(false);
      await loadData(); // Reload users
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Có lỗi xảy ra khi cập nhật người dùng");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLockAccount = async (userId: string) => {
    if (!confirm("Bạn có chắc chắn muốn khóa tài khoản này?")) {
      return;
    }

    try {
      const result = await updateUserStatus(userId, "INACTIVE");

      if (result.error) {
        alert(`Lỗi: ${result.error}`);
        return;
      }

      alert("Đã khóa tài khoản!");
      await loadData(); // Reload users
    } catch (error) {
      console.error("Error locking account:", error);
      alert("Có lỗi xảy ra khi khóa tài khoản");
    }
  };

  const getClassName = (classId: string | null | undefined) => {
    if (!classId) return "Chưa phân công";
    const found = classes.find((c) => c.id === classId);
    return found?.name || "N/A";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Quản lý người dùng</h2>
        <p className="text-sm text-slate-500">Tìm kiếm, thêm mới và cập nhật thông tin thành viên.</p>
      </header>

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, username, SĐT..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </button>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setClassFilter("");
            }}
          >
            <option value="">Tất cả ngành</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>
                Ngành {sector}
              </option>
            ))}
          </select>

          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            disabled={!sectorFilter}
          >
            <option value="">Chọn lớp</option>
            {filteredClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2 md:col-span-2 xl:col-span-1">
            <Button onClick={handleCreate} fullWidth className="flex items-center justify-center gap-2">
              <UserPlus className="h-4 w-4" />
              Thêm người dùng
            </Button>
            <Button onClick={handleClearFilters} variant="outline" fullWidth>
              <X className="h-4 w-4" />
              Xóa bộ lọc
            </Button>
          </div>
        </div>
      </Card>

      <div className="text-sm text-slate-600">
        Hiển thị {filteredUsers.length} / {users.length} người dùng
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  {user.saint_name ? `${user.saint_name} ` : ""}
                  {user.full_name}
                </h3>
                <p className="text-sm text-slate-500">{user.phone}</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {getRoleLabel(user.role as any)}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>
                <span className="font-medium">Ngành/Lớp:</span>{" "}
                {user.teacher_sector ? `Ngành ${user.teacher_sector}` : "N/A"}
                <br />
                <span className="ml-16">{getClassName(user.teacher_class_id)}</span>
              </p>
              <p>
                <span className="font-medium">Liên hệ:</span> {user.phone}
              </p>
              <p>
                <span className="font-medium">Trạng thái:</span>{" "}
                <span className={user.status === "ACTIVE" ? "text-emerald-600" : "text-red-600"}>
                  {user.status === "ACTIVE" ? "Hoạt động" : "Tạm nghỉ"}
                </span>
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleEdit(user)} fullWidth>
                Chỉnh sửa
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleLockAccount(user.id)}
                fullWidth
                disabled={user.status === "INACTIVE"}
              >
                Khóa
              </Button>
            </div>
          </Card>
        ))}
      </section>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Thêm người dùng mới"
        description="Điền đầy đủ thông tin để quản lý chính xác."
        size="xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Số điện thoại (làm username)"
            placeholder="0912345678"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Mật khẩu"
            type="password"
            placeholder="Nhập mật khẩu"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Select
            label="Vai trò"
            options={[{ value: "", label: "Chọn vai trò" }, ...roles]}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
          <Input
            label="Tên thánh"
            placeholder="Ví dụ: Gioan"
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
            label="Địa chỉ"
            placeholder="Nhập địa chỉ"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="md:col-span-2"
          />
          <Select
            label="Ngành"
            options={[
              { value: "", label: "Chọn ngành" },
              ...sectors.map((s) => ({ value: s, label: `Ngành ${s}` })),
            ]}
            value={formData.sector}
            onChange={(e) => {
              setFormData({ ...formData, sector: e.target.value as Sector, class_id: "" });
            }}
          />
          <Select
            label="Lớp"
            options={[
              { value: "", label: "Chọn lớp" },
              ...filteredClasses.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={formData.class_id}
            onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
            disabled={!formData.sector}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmitCreate} disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo..." : "Tạo mới"}
          </Button>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Cập nhật người dùng"
        description="Chỉnh sửa thông tin người dùng."
        size="xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Số điện thoại" placeholder="Số điện thoại" value={formData.phone} disabled />
          <Input
            label="Mật khẩu mới"
            type="password"
            placeholder="Để trống nếu không đổi"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Select
            label="Vai trò"
            options={[{ value: "", label: "Chọn vai trò" }, ...roles]}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
          <Input
            label="Tên thánh"
            placeholder="Ví dụ: Gioan"
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
            label="Địa chỉ"
            placeholder="Nhập địa chỉ"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="md:col-span-2"
          />
          <Select
            label="Ngành"
            options={[
              { value: "", label: "Chọn ngành" },
              ...sectors.map((s) => ({ value: s, label: `Ngành ${s}` })),
            ]}
            value={formData.sector}
            onChange={(e) => {
              setFormData({ ...formData, sector: e.target.value as Sector, class_id: "" });
            }}
          />
          <Select
            label="Lớp"
            options={[
              { value: "", label: "Chọn lớp" },
              ...filteredClasses.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={formData.class_id}
            onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
            disabled={!formData.sector}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmitEdit} disabled={isSubmitting}>
            {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
          </Button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import người dùng từ Excel"
        description="Tải lên file Excel với danh sách người dùng"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">Chọn file Excel để tải lên</p>
            <input type="file" accept=".xlsx,.xls" className="mt-4" />
          </div>
          <div className="rounded-lg bg-amber-50 p-4 text-xs text-amber-800">
            <p className="font-semibold">Lưu ý:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Headers ở dòng 3</li>
              <li>Data từ dòng 4</li>
              <li>Số điện thoại sẽ làm username</li>
              <li>Mật khẩu mặc định: 123456</li>
              <li>Phân đoàn: CHIÊN, ẤU, THIẾU, NGHĨA</li>
            </ul>
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
