import type { AppRole } from "@/types/auth";

const ADMIN_ALIASES = new Set([
  "admin",
  "administrator",
  "administrators",
  "ban dieu hanh",
  "ban điều hành",
  "ban-dieu-hanh",
  "board",
  "board_admin",
]);

const SECTOR_ALIASES = new Set([
  "sector_leader",
  "sectorleader",
  "leader",
  "phan_doan_truong", // Database value
  "phan doan truong",
  "phân đoàn trưởng",
  "phan-doan-truong",
  "truong nganh",
  "trưởng ngành",
]);

const CATECHIST_ALIASES = new Set([
  "catechist",
  "catechists",
  "teacher",
  "teachers",
  "giao_ly_vien", // Database value
  "giao ly vien",
  "giáo lý viên",
  "giao-ly-vien",
  "huynh truong",
  "huynh trưởng",
  "du truong",
  "dự trưởng",
]);

function normalizeInput(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function normalizeAppRole(role?: string | null): AppRole {
  const normalized = normalizeInput(role);

  if (ADMIN_ALIASES.has(normalized)) {
    return "admin";
  }

  if (SECTOR_ALIASES.has(normalized)) {
    return "sector_leader";
  }

  if (CATECHIST_ALIASES.has(normalized) || normalized) {
    return "catechist";
  }

  return "catechist";
}

export function getRoleLabel(role: AppRole): string {
  if (role === "admin") return "Ban điều hành";
  if (role === "sector_leader") return "Phân đoàn trưởng";
  return "Giáo lý viên";
}

const ROLE_PRIORITY: Record<AppRole, number> = {
  admin: 3,
  sector_leader: 2,
  catechist: 1,
};

export function getRolePriority(role: AppRole): number {
  return ROLE_PRIORITY[role];
}

/**
 * Converts code role values to database role values
 * Code uses: admin, sector_leader, catechist
 * Database uses: admin, phan_doan_truong, giao_ly_vien
 */
export function roleToDbValue(role: AppRole): string {
  switch (role) {
    case "admin":
      return "admin";
    case "sector_leader":
      return "phan_doan_truong";
    case "catechist":
      return "giao_ly_vien";
  }
}

/**
 * Converts database role values to code role values
 * Inverse of roleToDbValue
 */
export function dbValueToRole(dbValue: string): AppRole {
  return normalizeAppRole(dbValue);
}
