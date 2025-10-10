"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAppRole, roleToDbValue } from "@/lib/auth/roles";
import type { User, CreateUserInput, UpdateUserInput, Sector } from "@/types/database";

export type UserWithTeacherData = User & {
  teacher_sector?: Sector | null;
  teacher_sector_label?: string | null;
  teacher_class_id?: string | null;
  teacher_class_code?: string | null;
  class_name?: string | null;
};

const SECTOR_LABELS: Record<Sector, string> = {
  "CHIÊN": "Chiên",
  "ẤU": "Ấu",
  "THIẾU": "Thiếu",
  "NGHĨA": "Nghĩa",
};

type TeacherInfo = {
  sectorCode: Sector | null;
  sectorLabel: string | null;
  classId: string | null;
  className: string | null;
  classCode: string | null;
};

type ClassLookupValue = {
  id: string;
  name: string;
};

const SECTOR_LOOKUP = (() => {
  const lookup = new Map<string, Sector>();
  const add = (value: string, code: Sector) => {
    const key = normalizeKey(value);
    if (key) {
      lookup.set(key, code);
    }
  };

  (Object.entries(SECTOR_LABELS) as Array<[Sector, string]>).forEach(([code, label]) => {
    add(code, code);
    add(label, code);
  });

  return lookup;
})();

function normalizeKey(value?: string | null): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function resolveSectorInfo(raw?: string | null): { code: Sector; label: string } | null {
  const normalized = normalizeKey(raw);
  if (!normalized) {
    return null;
  }

  const code = SECTOR_LOOKUP.get(normalized);
  if (!code) {
    return null;
  }

  return {
    code,
    label: SECTOR_LABELS[code],
  };
}

function buildClassLookup(rows: Array<{ id: string; name?: string | null }>): Map<string, ClassLookupValue> {
  const lookup = new Map<string, ClassLookupValue>();

  rows.forEach((cls) => {
    if (!cls?.id) return;
    const info: ClassLookupValue = {
      id: cls.id,
      name: cls.name ?? cls.id,
    };

    const keys = new Set<string>();
    keys.add(normalizeKey(cls.id));
    if (cls.name) {
      keys.add(normalizeKey(cls.name));
    }

    keys.forEach((key) => {
      if (key) {
        lookup.set(key, info);
      }
    });
  });

  return lookup;
}

function resolveClassInfo(
  teacher: { class_id?: string | null; class_code?: string | null; class_name?: string | null },
  classLookup: Map<string, ClassLookupValue>,
): ClassLookupValue | null {
  const candidates = [teacher.class_id, teacher.class_code, teacher.class_name];

  for (const candidate of candidates) {
    const key = normalizeKey(candidate);
    if (!key) continue;
    const classInfo = classLookup.get(key);
    if (classInfo) {
      return classInfo;
    }
  }

  return null;
}

async function fetchTeacherInfoMap(
  supabase: SupabaseClient,
  phones: string[],
): Promise<Map<string, TeacherInfo>> {
  const map = new Map<string, TeacherInfo>();

  const normalizedPhones = Array.from(
    new Set(
      phones
        .map((phone) => phone?.trim())
        .filter((phone): phone is string => Boolean(phone)),
    ),
  );

  if (normalizedPhones.length === 0) {
    return map;
  }

  const { data: teachers, error: teachersError } = await supabase
    .from("teachers")
    .select("phone, sector, class_name, class_code")
    .in("phone", normalizedPhones);

  if (teachersError) {
    console.error("Error fetching teacher records:", teachersError);
    return map;
  }

  const teacherRows = Array.isArray(teachers) ? teachers : [];
  if (teacherRows.length === 0) {
    return map;
  }

  const { data: classRows, error: classesError } = await supabase
    .from("classes")
    .select("id, name");

  if (classesError) {
    console.warn("Error fetching classes for teacher lookup:", classesError.message ?? classesError);
  }

  const classLookup = buildClassLookup((classRows as Array<{ id: string; name?: string | null }> | null) ?? []);

  teacherRows.forEach((teacher: any) => {
    const sectorInfo = resolveSectorInfo(teacher.sector);
    const classInfo = resolveClassInfo(teacher, classLookup);

    map.set(teacher.phone, {
      sectorCode: sectorInfo?.code ?? null,
      sectorLabel: sectorInfo?.label ?? teacher.sector ?? null,
      classId: classInfo?.id ?? null,
      className: classInfo?.name ?? teacher.class_name ?? teacher.class_code ?? null,
      classCode: teacher.class_code ?? null,
    });
  });

  return map;
}

async function resolveClassNameById(
  supabase: SupabaseClient,
  classId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("classes")
    .select("name")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    console.warn("Failed to resolve class name:", error.message ?? error);
    return null;
  }

  return data?.name ?? null;
}

/**
 * Fetch all users from the database with optional filters
 */
export async function fetchUsers(filters?: {
  search?: string;
  role?: string;
  sector?: string;
  class_id?: string;
}): Promise<{ data: UserWithTeacherData[] | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Start with base query
    let query = supabase
      .from("user_profiles")
      .select(
        `
        id,
        email,
        phone,
        role,
        full_name,
        saint_name,
        status,
        created_at,
        updated_at
      `
      )
      .order("created_at", { ascending: false });

    // Apply search filter
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      );
    }

    // Apply role filter
    if (filters?.role) {
      query = query.eq("role", filters.role);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      return { data: null, error: error.message };
    }

    if (!users) {
      return { data: [], error: null };
    }

    const userPhones = users
      .map((u) => (u.phone ? String(u.phone).trim() : ""))
      .filter((phone) => phone !== "");

    const teacherInfoMap = await fetchTeacherInfoMap(supabase, userPhones);

    const usersWithTeacherData: UserWithTeacherData[] = users.map((user) => {
      const phone = user.phone ? String(user.phone).trim() : "";
      const teacherData = phone ? teacherInfoMap.get(phone) : undefined;
      const sectorCode = teacherData?.sectorCode ?? null;

      return {
        id: user.id,
        username: user.email || user.phone || "",
        email: user.email,
        phone: user.phone || "",
        role: user.role || "catechist",
        saint_name: user.saint_name,
        full_name: user.full_name || "",
        date_of_birth: null,
        address: null,
        status: (user.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
        sector: sectorCode,
        class_id: teacherData?.classId ?? null,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString(),
        teacher_sector: sectorCode,
        teacher_sector_label: teacherData?.sectorLabel ?? null,
        teacher_class_id: teacherData?.classId ?? null,
        teacher_class_code: teacherData?.classCode ?? null,
        class_name: teacherData?.className ?? null,
      };
    });

    // Apply sector filter (from teacher data)
    let filteredUsers = usersWithTeacherData;
    if (filters?.sector) {
      filteredUsers = filteredUsers.filter(
        (u) => u.teacher_sector === filters.sector
      );
    }

    // Apply class filter (from teacher data)
    if (filters?.class_id) {
      filteredUsers = filteredUsers.filter(
        (u) => u.teacher_class_id === filters.class_id
      );
    }

    return { data: filteredUsers, error: null };
  } catch (err) {
    console.error("Unexpected error fetching users:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetch a single user by ID
 */
export async function fetchUserById(
  userId: string
): Promise<{ data: UserWithTeacherData | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: user, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const phone = user.phone ? String(user.phone).trim() : "";
    const teacherInfoMap = await fetchTeacherInfoMap(supabase, phone ? [phone] : []);
    const teacherData = phone ? teacherInfoMap.get(phone) : undefined;
    const sectorCode = teacherData?.sectorCode ?? null;

    const userWithTeacherData: UserWithTeacherData = {
      id: user.id,
      username: user.email || user.phone || "",
      email: user.email,
      phone: user.phone || "",
      role: user.role || "catechist",
      saint_name: user.saint_name,
      full_name: user.full_name || "",
      date_of_birth: null,
      address: null,
      status: (user.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
      sector: sectorCode,
      class_id: teacherData?.classId ?? null,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString(),
      teacher_sector: sectorCode,
      teacher_sector_label: teacherData?.sectorLabel ?? null,
      teacher_class_id: teacherData?.classId ?? null,
      teacher_class_code: teacherData?.classCode ?? null,
      class_name: teacherData?.className ?? null,
    };

    return { data: userWithTeacherData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Create a new user
 */
export async function createUser(
  input: CreateUserInput
): Promise<{ data: User | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Create auth user first
    const phoneEmail = `${input.phone.trim()}@phone.local`.toLowerCase();
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: phoneEmail,
        password: input.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return { data: null, error: authError?.message || "Failed to create auth user" };
    }

    // Create user profile with normalized role
    const dbRole = roleToDbValue(normalizeAppRole(input.role));
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: authData.user.id,
        email: phoneEmail,
        phone: input.phone,
        role: dbRole,
        full_name: input.full_name,
        saint_name: input.saint_name || null,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { data: null, error: profileError.message };
    }

    const teacherPayload: Record<string, unknown> = {
      phone: input.phone,
      full_name: input.full_name,
      saint_name: input.saint_name || null,
      role: dbRole,
    };

    if (input.sector) {
      teacherPayload.sector = SECTOR_LABELS[input.sector];
    }

    if (input.class_id) {
      teacherPayload.class_name =
        (await resolveClassNameById(supabase, input.class_id)) ?? input.class_id;
    }

    const { error: teacherError } = await supabase.from("teachers").upsert(teacherPayload);
    if (teacherError) {
      console.error("Failed to upsert teacher record:", teacherError);
    }

    return {
      data: {
        id: profile.id,
        username: profile.email || profile.phone || "",
        email: profile.email,
        phone: profile.phone || "",
        role: profile.role,
        saint_name: profile.saint_name,
        full_name: profile.full_name || "",
        date_of_birth: null,
        address: null,
        status: profile.status as "ACTIVE" | "INACTIVE",
        sector: input.sector || null,
        class_id: input.class_id || null,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Update user information
 */
export async function updateUser(
  userId: string,
  input: UpdateUserInput
): Promise<{ data: User | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Prepare update data for user_profiles
    const updateData: any = {};
    if (input.full_name !== undefined) updateData.full_name = input.full_name;
    if (input.saint_name !== undefined) updateData.saint_name = input.saint_name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.role !== undefined) {
      updateData.role = roleToDbValue(normalizeAppRole(input.role));
    }
    if (input.status !== undefined) updateData.status = input.status;

    // Update user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (profileError) {
      return { data: null, error: profileError.message };
    }

    // Update password if provided
    if (input.password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: input.password }
      );
      if (passwordError) {
        console.error("Failed to update password:", passwordError);
      }
    }

    const shouldSyncTeacher =
      profile.phone &&
      (input.sector !== undefined ||
        input.class_id !== undefined ||
        input.full_name !== undefined ||
        input.saint_name !== undefined ||
        input.role !== undefined);

    if (shouldSyncTeacher && profile.phone) {
      const teacherUpdate: Record<string, unknown> = {
        phone: profile.phone,
      };

      if (input.full_name !== undefined) {
        teacherUpdate.full_name = input.full_name;
      }

      if (input.saint_name !== undefined) {
        teacherUpdate.saint_name = input.saint_name;
      }

      if (input.role !== undefined) {
        teacherUpdate.role = roleToDbValue(normalizeAppRole(input.role));
      }

      if (input.sector !== undefined) {
        teacherUpdate.sector = input.sector
          ? SECTOR_LABELS[input.sector]
          : null;
      }

      if (input.class_id !== undefined) {
        if (input.class_id) {
          teacherUpdate.class_name =
            (await resolveClassNameById(supabase, input.class_id)) ?? input.class_id;
        } else {
          teacherUpdate.class_name = null;
        }
      }

      const { error: teacherError } = await supabase.from("teachers").upsert(teacherUpdate);
      if (teacherError) {
        console.error("Failed to sync teacher record:", teacherError);
      }
    }

    return {
      data: {
        id: profile.id,
        username: profile.email || profile.phone || "",
        email: profile.email,
        phone: profile.phone || "",
        role: profile.role,
        saint_name: profile.saint_name,
        full_name: profile.full_name || "",
        date_of_birth: null,
        address: null,
        status: profile.status as "ACTIVE" | "INACTIVE",
        sector: input.sector || null,
        class_id: input.class_id || null,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Update user status (lock/unlock account)
 */
export async function updateUserStatus(
  userId: string,
  status: "ACTIVE" | "INACTIVE"
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("user_profiles")
      .update({ status })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Also update auth user status
    if (status === "INACTIVE") {
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // 100 years
      });
    } else {
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Delete user (soft delete by setting status to INACTIVE)
 */
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  return updateUserStatus(userId, "INACTIVE");
}
