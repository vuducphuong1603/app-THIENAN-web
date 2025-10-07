import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "@/types/auth";
import { roleToDbValue } from "./roles";

/**
 * Updates a user's role in the user_profiles table.
 * The database trigger automatically syncs to the teachers table via phone matching.
 *
 * Note: The database uses different role values (phan_doan_truong, giao_ly_vien)
 * than the code (sector_leader, catechist), so we convert before saving.
 *
 * After the database migration (20250107_sync_roles_between_tables.sql),
 * updating user_profiles will automatically trigger a sync to the teachers table.
 *
 * @param client - The Supabase client instance
 * @param userId - The UUID of the user whose role should be updated
 * @param newRole - The new role to assign
 * @returns Promise resolving to success status and any error
 */
export async function updateUserRole(
  client: SupabaseClient,
  userId: string,
  newRole: AppRole,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert code role value to database role value
    const dbRoleValue = roleToDbValue(newRole);

    // Update the user_profiles table (primary source of truth)
    // The database trigger automatically syncs to teachers table
    const { error: profileError } = await client
      .from("user_profiles")
      .update({ role: dbRoleValue })
      .eq("id", userId);

    if (profileError) {
      console.error("Failed to update user_profiles role:", profileError);
      return {
        success: false,
        error: `Failed to update profile: ${profileError.message}`,
      };
    }

    // The database trigger handles syncing to teachers table automatically
    // No need to manually update teachers table

    return { success: true };
  } catch (error) {
    console.error("Unexpected error updating user role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Updates multiple users' roles in batch.
 * Useful for bulk role assignments.
 *
 * @param client - The Supabase client instance
 * @param updates - Array of { userId, newRole } objects
 * @returns Promise resolving to results for each update
 */
export async function updateUserRolesBatch(
  client: SupabaseClient,
  updates: Array<{ userId: string; newRole: AppRole }>,
): Promise<Array<{ userId: string; success: boolean; error?: string }>> {
  const results = await Promise.all(
    updates.map(async ({ userId, newRole }) => {
      const result = await updateUserRole(client, userId, newRole);
      return { userId, ...result };
    }),
  );

  return results;
}
