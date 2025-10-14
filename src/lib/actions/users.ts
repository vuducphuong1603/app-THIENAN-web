"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  birthDate: string | null;
  address: string | null;
};

type TeacherRowForLookup = {
  phone?: string | null;
  sector?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  class_code?: string | null;
  birth_date?: string | null;
  address?: string | null;
};

type ClassLookupValue = {
  id: string;
  name: string;
  sector: Sector | null;
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

function normalizePhoneKey(value?: string | null): string {
  if (!value) return "";

  const digitsOnly = value.replace(/[^0-9]/g, "");
  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("84") && digitsOnly.length >= 9) {
    return `0${digitsOnly.slice(2)}`;
  }

  if (digitsOnly.startsWith("0")) {
    return digitsOnly;
  }

  return digitsOnly;
}

function resolveSectorInfo(raw?: string | null): { code: Sector; label: string } | null {
  const normalized = normalizeKey(raw);
  if (!normalized) {
    return null;
  }

  const directCode = SECTOR_LOOKUP.get(normalized);
  if (directCode) {
    return {
      code: directCode,
      label: SECTOR_LABELS[directCode],
    };
  }

  if (normalized.includes("CHIEN")) {
    return { code: "CHIÊN", label: SECTOR_LABELS["CHIÊN"] };
  }

  if (normalized.includes("NGHIA")) {
    return { code: "NGHĨA", label: SECTOR_LABELS["NGHĨA"] };
  }

  if (normalized.includes("THIEU")) {
    return { code: "THIẾU", label: SECTOR_LABELS["THIẾU"] };
  }

  if (normalized.includes("AU")) {
    return { code: "ẤU", label: SECTOR_LABELS["ẤU"] };
  }

  return null;
}

function buildClassLookup(rows: Array<{ id: string; name?: string | null; sector?: string | null }>): Map<string, ClassLookupValue> {
  const lookup = new Map<string, ClassLookupValue>();

  rows.forEach((cls) => {
    if (!cls?.id) return;
    const sectorInfo = resolveSectorInfo(cls.sector);
    const info: ClassLookupValue = {
      id: cls.id,
      name: cls.name ?? cls.id,
      sector: sectorInfo?.code ?? null,
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

  const normalizedPhoneKeySet = new Set(
    phones
      .map((phone) => normalizePhoneKey(phone?.trim()))
      .filter((phoneKey): phoneKey is string => Boolean(phoneKey)),
  );

  if (normalizedPhoneKeySet.size === 0) {
    return map;
  }

  const { data: teachers, error: teachersError } = await supabase
    .from("teachers")
    .select("phone, sector, class_id, class_name, class_code, birth_date, address");

  if (teachersError) {
    console.error("Error fetching teacher records:", teachersError);
    return map;
  }

  const teacherRows = Array.isArray(teachers) ? (teachers as TeacherRowForLookup[]) : [];
  if (teacherRows.length === 0) {
    return map;
  }

  const { data: classRows, error: classesError } = await supabase
    .from("classes")
    .select("id, name, sector");

  if (classesError) {
    console.warn("Error fetching classes for teacher lookup:", classesError.message ?? classesError);
  }

  const classLookup = buildClassLookup(
    (classRows as Array<{ id: string; name?: string | null; sector?: string | null }> | null) ?? [],
  );

  teacherRows.forEach((teacher) => {
    const phone = typeof teacher.phone === "string" ? teacher.phone.trim() : "";
    const normalizedPhone = normalizePhoneKey(phone);

    if (!phone || !normalizedPhone) {
      return;
    }

    if (!normalizedPhoneKeySet.has(normalizedPhone)) {
      return;
    }

    const classInfo = resolveClassInfo(teacher, classLookup);
    const classId = teacher.class_id ?? classInfo?.id ?? null;
    const className = classInfo?.name ?? teacher.class_name ?? teacher.class_code ?? null;
    const classSectorCode = classInfo?.sector ?? null;
    const sectorInfo = resolveSectorInfo(teacher.sector);
    const finalSectorCode = sectorInfo?.code ?? classSectorCode ?? null;
    const finalSectorLabel =
      sectorInfo?.label ??
      (finalSectorCode ? SECTOR_LABELS[finalSectorCode] : teacher.sector ?? null);

    const teacherInfo: TeacherInfo = {
      sectorCode: finalSectorCode,
      sectorLabel: finalSectorLabel,
      classId,
      className,
      classCode: teacher.class_code ?? classInfo?.id ?? null,
      birthDate: teacher.birth_date ?? null,
      address: teacher.address ?? null,
    };

    map.set(normalizedPhone, teacherInfo);

    const secondaryKey = normalizeKey(phone);
    if (secondaryKey) {
      map.set(secondaryKey, teacherInfo);
    }
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

function deriveNameParts(
  fullName?: string | null,
): { firstName: string | null; lastName: string | null } {
  if (!fullName) {
    return { firstName: null, lastName: null };
  }

  const normalized = fullName
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) {
    return { firstName: null, lastName: null };
  }

  const parts = normalized.split(" ");
  const firstName = parts.pop() ?? null;
  const lastName = parts.length > 0 ? parts.join(" ") : null;

  return {
    firstName: firstName ?? null,
    lastName,
  };
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
    const normalizedPhoneKey = normalizePhoneKey(phone);
    const teacherData = normalizedPhoneKey
      ? teacherInfoMap.get(normalizedPhoneKey) ?? teacherInfoMap.get(normalizeKey(phone))
      : undefined;
      const sectorCode = teacherData?.sectorCode ?? null;

      return {
        id: user.id,
        username: user.email || user.phone || "",
        email: user.email,
        phone: user.phone || "",
        role: user.role || "catechist",
        saint_name: user.saint_name,
        full_name: user.full_name || "",
        date_of_birth: teacherData?.birthDate ?? null,
        address: teacherData?.address ?? null,
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
      date_of_birth: teacherData?.birthDate ?? null,
      address: teacherData?.address ?? null,
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
    // Use admin client for creating auth users
    let adminClient;
    try {
      adminClient = createSupabaseAdminClient();
    } catch (error) {
      console.error("Failed to create admin client:", error);
      return {
        data: null,
        error: "Service configuration error: Unable to create users. Please contact your administrator to configure the SUPABASE_SERVICE_ROLE_KEY."
      };
    }
    const supabase = await createSupabaseServerClient();

    // Create auth user first
    const phoneEmail = `${input.phone.trim()}@phone.local`.toLowerCase();
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
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
      // Trigger `handle_new_user` may have already inserted a row; upsert keeps data in sync
      .upsert({
        id: authData.user.id,
        email: phoneEmail,
        phone: input.phone,
        role: dbRole,
        full_name: input.full_name,
        saint_name: input.saint_name || null,
        status: "ACTIVE",
      }, { onConflict: "id" })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { data: null, error: profileError.message };
    }

    const trimmedPhone = input.phone.trim();
    const trimmedFullName = input.full_name.trim();
    const saintName = input.saint_name?.trim();
    const birthDate = input.date_of_birth?.trim();
    const address = input.address?.trim();
    const classId = input.class_id?.trim();
    const { firstName, lastName } = deriveNameParts(trimmedFullName);
    const resolvedClassName =
      classId ? (await resolveClassNameById(supabase, classId)) ?? classId : null;

    const teacherPayload: Record<string, unknown> = {
      phone: trimmedPhone,
      full_name: trimmedFullName,
      first_name: firstName,
      last_name: lastName,
      saint_name: saintName || null,
      role: dbRole,
      status: "teaching",
      birth_date: birthDate || null,
      address: address || null,
    };

    if (classId) {
      teacherPayload.class_id = classId;
      teacherPayload.class_name = resolvedClassName;
    }

    if (input.sector) {
      teacherPayload.sector = SECTOR_LABELS[input.sector];
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
        date_of_birth: input.date_of_birth ?? null,
        address: input.address ?? null,
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
    const adminClient = createSupabaseAdminClient();

    // Prepare update data for user_profiles
    const updateData: Record<string, unknown> = {};
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
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(
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
        input.role !== undefined ||
        input.address !== undefined ||
        input.date_of_birth !== undefined ||
        input.phone !== undefined);

    if (shouldSyncTeacher && profile.phone) {
      const trimmedProfilePhone = profile.phone.trim();
      const teacherUpdate: Record<string, unknown> = {
        phone: trimmedProfilePhone || profile.phone,
        status: "teaching",
      };

      if (input.full_name !== undefined) {
        const trimmedFullName = input.full_name.trim();
        if (trimmedFullName) {
          const { firstName, lastName } = deriveNameParts(trimmedFullName);
          teacherUpdate.full_name = trimmedFullName;
          teacherUpdate.first_name = firstName;
          teacherUpdate.last_name = lastName;
        } else {
          teacherUpdate.full_name = null;
          teacherUpdate.first_name = null;
          teacherUpdate.last_name = null;
        }
      }

      if (input.saint_name !== undefined) {
        const saintName = input.saint_name?.trim();
        teacherUpdate.saint_name = saintName || null;
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
        const trimmedClassId = input.class_id?.trim();
        teacherUpdate.class_id = trimmedClassId || null;
        teacherUpdate.class_name = trimmedClassId
          ? (await resolveClassNameById(supabase, trimmedClassId)) ?? trimmedClassId
          : null;
      }

      if (input.address !== undefined) {
        const trimmedAddress = input.address?.trim();
        teacherUpdate.address = trimmedAddress || null;
      }

      if (input.date_of_birth !== undefined) {
        const birthDate = input.date_of_birth?.trim();
        teacherUpdate.birth_date = birthDate || null;
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
        date_of_birth: input.date_of_birth ?? null,
        address: input.address ?? null,
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
    const adminClient = createSupabaseAdminClient();

    const { error } = await supabase
      .from("user_profiles")
      .update({ status })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Also update auth user status
    if (status === "INACTIVE") {
      await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: "876000h", // 100 years
      });
    } else {
      await adminClient.auth.admin.updateUserById(userId, {
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
