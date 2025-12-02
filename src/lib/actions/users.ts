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
  birthDate: string | null;
  address: string | null;
};

type TeacherRowForLookup = {
  phone?: string | null;
  sector?: string | null;
  class_id?: string | null;
  class_name?: string | null;
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

function formatPhoneToE164(phone?: string | null): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/[^0-9]/g, "");
    if (digits.length < 8 || digits.length > 15) {
      return null;
    }
    return `+${digits}`;
  }

  const digitsOnly = trimmed.replace(/[^0-9]/g, "");
  if (!digitsOnly) {
    return null;
  }

  if (digitsOnly.startsWith("84")) {
    if (digitsOnly.length < 9 || digitsOnly.length > 15) {
      return null;
    }
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("0") && digitsOnly.length >= 9 && digitsOnly.length <= 15) {
    return `+84${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length >= 9 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return null;
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
  teacher: { class_id?: string | null; class_name?: string | null },
  classLookup: Map<string, ClassLookupValue>,
): ClassLookupValue | null {
  const candidates = [teacher.class_id, teacher.class_name];

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
    .select("phone, sector, class_id, class_name, birth_date, address");

  if (teachersError) {
    console.error("Error fetching teacher records:", teachersError);
    return map;
  }

  const teacherRows = Array.isArray(teachers) ? (teachers as TeacherRowForLookup[]) : [];
  if (teacherRows.length === 0) {
    return map;
  }

  // Join với bảng sectors để lấy sector code thay vì sector_id
  const { data: classRows, error: classesError } = await supabase
    .from("classes")
    .select("id, name, sectors(code)");

  if (classesError) {
    console.warn("Error fetching classes for teacher lookup:", classesError.message ?? classesError);
  }

  // Transform kết quả join thành format cũ
  const transformedClasses = (classRows ?? []).map((cls: { id: string; name?: string | null; sectors?: { code?: string | null } | null }) => ({
    id: cls.id,
    name: cls.name,
    sector: cls.sectors?.code ?? null,
  }));

  const classLookup = buildClassLookup(transformedClasses);

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
    const className = classInfo?.name ?? teacher.class_name ?? null;
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

      // Debug: log user status from database
      if (user.full_name === "Ngọc Ái" || user.full_name?.includes("Teresa")) {
        console.log("FetchUsers - Raw user.status for Teresa:", user.status);
      }

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

    const trimmedPhone = input.phone.trim();
    const trimmedFullName = input.full_name.trim();
    const trimmedUsername = input.username?.trim() || trimmedPhone;
    const saintName = input.saint_name?.trim();
    const birthDate = input.date_of_birth?.trim();
    const address = input.address?.trim();
    const classId = input.class_id?.trim();
    const { firstName, lastName } = deriveNameParts(trimmedFullName);
    const dbRole = roleToDbValue(normalizeAppRole(input.role));

    const phoneEmail = `${trimmedPhone}@phone.local`.toLowerCase();
    const e164Phone = formatPhoneToE164(trimmedPhone);

    const userMetadata: Record<string, string> = {};
    if (trimmedFullName) {
      userMetadata.display_name = trimmedFullName;
      userMetadata.full_name = trimmedFullName;
    }
    if (firstName) {
      userMetadata.first_name = firstName;
    }
    if (lastName) {
      userMetadata.last_name = lastName;
    }
    if (trimmedPhone) {
      userMetadata.phone = trimmedPhone;
    }
    if (e164Phone) {
      userMetadata.phone_e164 = e164Phone;
    }
    userMetadata.username = trimmedUsername;
    userMetadata.role = dbRole;
    if (saintName) {
      userMetadata.saint_name = saintName;
    }

    // Create auth user first
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: phoneEmail,
        password: input.password,
        email_confirm: true,
        phone: e164Phone || undefined,
        phone_confirm: e164Phone ? true : undefined,
        user_metadata: userMetadata,
      });

    if (authError || !authData.user) {
      return { data: null, error: authError?.message || "Failed to create auth user" };
    }

    // Create user profile with normalized role
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      // Trigger `handle_new_user` may have already inserted a row; upsert keeps data in sync
      .upsert(
        {
          id: authData.user.id,
          email: phoneEmail,
          phone: trimmedPhone,
          role: dbRole,
          full_name: trimmedFullName,
          saint_name: saintName || null,
          status: "ACTIVE",
          class_id: classId && classId.length > 0 ? classId : null,
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { data: null, error: profileError.message };
    }

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

      // If no sector specified but class has sector, derive it
      if (!input.sector) {
        const { data: classData } = await supabase
          .from("classes")
          .select("sector")
          .eq("id", classId)
          .single();

        if (classData?.sector) {
          teacherPayload.sector = SECTOR_LABELS[classData.sector as Sector];
        }
      }
    }

    if (input.sector) {
      teacherPayload.sector = SECTOR_LABELS[input.sector];
    }

    const { error: teacherError } = await supabase.from("teachers").upsert(teacherPayload, {
      onConflict: "phone",
    });
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
        class_id: profile.class_id ?? null,
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
    if (input.class_id !== undefined) {
      const trimmedClassId = input.class_id?.trim();
      updateData.class_id = trimmedClassId && trimmedClassId.length > 0 ? trimmedClassId : null;
    }

    // Debug: Log what we're updating
    console.log("UpdateUser - updateData:", updateData);
    console.log("UpdateUser - has status in input?", input.status !== undefined);

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

    // Debug: Log what we got back
    console.log("UpdateUser - profile.status after update:", profile.status);

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

        // If class is set but sector is not being updated, derive sector from class
        if (trimmedClassId && input.sector === undefined) {
          const { data: classData } = await supabase
            .from("classes")
            .select("sector")
            .eq("id", trimmedClassId)
            .single();

          if (classData?.sector) {
            teacherUpdate.sector = SECTOR_LABELS[classData.sector as Sector];
          }
        }
      }

      if (input.address !== undefined) {
        const trimmedAddress = input.address?.trim();
        teacherUpdate.address = trimmedAddress || null;
      }

      if (input.date_of_birth !== undefined) {
        const birthDate = input.date_of_birth?.trim();
        teacherUpdate.birth_date = birthDate || null;
      }

      const { error: teacherError } = await supabase.from("teachers").upsert(teacherUpdate, {
        onConflict: "phone",
      });
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
        class_id: profile.class_id ?? null,
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
 * Permanently delete a user from Supabase and related tables.
 */
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("phone")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      return { success: false, error: profileError.message };
    }

    const { error: authError } = await adminClient.auth.admin.deleteUser(userId);
    if (authError) {
      return { success: false, error: authError.message };
    }

    const { error: profileDeleteError } = await supabase.from("user_profiles").delete().eq("id", userId);
    if (profileDeleteError && profileDeleteError.code !== "PGRST116") {
      return { success: false, error: profileDeleteError.message };
    }

    const phone = profile?.phone?.trim();
    if (phone) {
      const { error: teacherError } = await supabase.from("teachers").delete().eq("phone", phone);
      if (teacherError) {
        console.error("Failed to delete teacher record for user:", teacherError);
      }
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Error deleting user:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
