"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Class, Sector } from "@/types/database";

/**
 * Fetch all classes from the database with optional sector filter
 */
export async function fetchClasses(sector?: Sector): Promise<{
  data: Class[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from("classes")
      .select("id, name, sector, created_at, updated_at")
      .order("sector")
      .order("name");

    // Apply sector filter if provided
    if (sector) {
      query = query.eq("sector", sector);
    }

    const { data: classes, error } = await query;

    if (error) {
      console.error("Error fetching classes:", error);
      return { data: null, error: error.message };
    }

    return { data: classes || [], error: null };
  } catch (err) {
    console.error("Unexpected error fetching classes:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetch a single class by ID
 */
export async function fetchClassById(classId: string): Promise<{
  data: Class | null;
  error: string | null;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: classData, error } = await supabase
      .from("classes")
      .select("id, name, sector, created_at, updated_at")
      .eq("id", classId)
      .single();

    if (error) {
      console.error("Error fetching class:", error);
      return { data: null, error: error.message };
    }

    return { data: classData, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
