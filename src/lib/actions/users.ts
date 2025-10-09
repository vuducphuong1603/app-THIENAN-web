"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAppRole, roleToDbValue } from "@/lib/auth/roles";
import type { User, CreateUserInput, UpdateUserInput, Sector } from "@/types/database";

export type UserWithTeacherData = User & {
  teacher_sector?: string | null;
  teacher_class_id?: string | null;
  class_name?: string | null;
};

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

    // Get teacher data for users with phone numbers
    const userPhones = users
      .filter((u) => u.phone)
      .map((u) => u.phone as string);

    let teachersMap = new Map<
      string,
      { sector?: Sector; class_id?: string; class_name?: string }
    >();

    if (userPhones.length > 0) {
      const { data: teachers } = await supabase
        .from("teachers")
        .select(
          `
          phone,
          sector,
          class_id,
          classes (
            name
          )
        `
        )
        .in("phone", userPhones);

      if (teachers) {
        teachers.forEach((teacher: any) => {
          const classes = Array.isArray(teacher.classes) ? teacher.classes[0] : teacher.classes;
          teachersMap.set(teacher.phone, {
            sector: teacher.sector as Sector | undefined,
            class_id: teacher.class_id,
            class_name: classes?.name,
          });
        });
      }
    }

    // Merge user and teacher data
    const usersWithTeacherData: UserWithTeacherData[] = users.map((user) => {
      const teacherData = user.phone ? teachersMap.get(user.phone) : null;

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
        sector: (teacherData?.sector as Sector | undefined) || null,
        class_id: teacherData?.class_id || null,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString(),
        teacher_sector: teacherData?.sector,
        teacher_class_id: teacherData?.class_id,
        class_name: teacherData?.class_name,
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

    // Get teacher data if phone exists
    let teacherData: { sector?: Sector; class_id?: string; class_name?: string } | null = null;
    if (user.phone) {
      const { data: teacher } = await supabase
        .from("teachers")
        .select(
          `
          sector,
          class_id,
          classes (
            name
          )
        `
        )
        .eq("phone", user.phone)
        .maybeSingle();

      if (teacher) {
        const classes = Array.isArray(teacher.classes) ? teacher.classes[0] : teacher.classes;
        teacherData = {
          sector: teacher.sector as Sector | undefined,
          class_id: teacher.class_id,
          class_name: classes?.name,
        };
      }
    }

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
      sector: teacherData?.sector || null,
      class_id: teacherData?.class_id || null,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString(),
      teacher_sector: teacherData?.sector,
      teacher_class_id: teacherData?.class_id,
      class_name: teacherData?.class_name,
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

    // If sector and class are provided, create/update teacher record
    if (input.sector && input.class_id) {
      await supabase
        .from("teachers")
        .upsert({
          phone: input.phone,
          full_name: input.full_name,
          saint_name: input.saint_name || null,
          role: dbRole,
          sector: input.sector,
          class_id: input.class_id,
        });
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

    // Update teacher record if sector/class provided
    if (profile.phone && (input.sector !== undefined || input.class_id !== undefined)) {
      const teacherUpdate: any = {};
      if (input.sector !== undefined) teacherUpdate.sector = input.sector;
      if (input.class_id !== undefined) teacherUpdate.class_id = input.class_id;
      if (input.full_name !== undefined) teacherUpdate.full_name = input.full_name;
      if (input.saint_name !== undefined) teacherUpdate.saint_name = input.saint_name;
      if (input.role !== undefined) {
        teacherUpdate.role = roleToDbValue(normalizeAppRole(input.role));
      }

      await supabase
        .from("teachers")
        .upsert({
          phone: profile.phone,
          ...teacherUpdate,
        });
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
