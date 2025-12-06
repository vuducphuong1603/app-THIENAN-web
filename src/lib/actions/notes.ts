"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReminderOption = "30_min" | "2_hours" | "1_day" | "custom";
export type NoteStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface Note {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  link: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  reminder: ReminderOption | null;
  status: NoteStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  title: string;
  description?: string;
  link?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  reminder?: ReminderOption;
}

export interface UpdateNoteInput {
  title?: string;
  description?: string;
  link?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  reminder?: ReminderOption;
  status?: NoteStatus;
}

/**
 * Fetch all notes for the current user
 */
export async function fetchNotes(filters?: {
  status?: NoteStatus;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: Note[] | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    let query = supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Apply status filter
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    // Apply date range filter
    if (filters?.startDate) {
      query = query.gte("start_date", filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte("start_date", filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching notes:", error);
      return { data: null, error: error.message };
    }

    return { data: data as Note[], error: null };
  } catch (err) {
    console.error("Unexpected error fetching notes:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetch a single note by ID
 */
export async function fetchNoteById(
  noteId: string
): Promise<{ data: Note | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Note, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Create a new note
 */
export async function createNote(
  input: CreateNoteInput
): Promise<{ data: Note | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      return { data: null, error: "Title is required" };
    }

    const noteData = {
      user_id: user.id,
      title: trimmedTitle,
      description: input.description?.trim() || null,
      link: input.link?.trim() || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      reminder: input.reminder || null,
      status: "pending" as NoteStatus,
    };

    const { data, error } = await supabase
      .from("notes")
      .insert(noteData)
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return { data: null, error: error.message };
    }

    return { data: data as Note, error: null };
  } catch (err) {
    console.error("Unexpected error creating note:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Update an existing note
 */
export async function updateNote(
  noteId: string,
  input: UpdateNoteInput
): Promise<{ data: Note | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        return { data: null, error: "Title cannot be empty" };
      }
      updateData.title = trimmedTitle;
    }
    if (input.description !== undefined) {
      updateData.description = input.description.trim() || null;
    }
    if (input.link !== undefined) {
      updateData.link = input.link.trim() || null;
    }
    if (input.start_date !== undefined) {
      updateData.start_date = input.start_date || null;
    }
    if (input.end_date !== undefined) {
      updateData.end_date = input.end_date || null;
    }
    if (input.start_time !== undefined) {
      updateData.start_time = input.start_time || null;
    }
    if (input.end_time !== undefined) {
      updateData.end_time = input.end_time || null;
    }
    if (input.reminder !== undefined) {
      updateData.reminder = input.reminder || null;
    }
    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    const { data, error } = await supabase
      .from("notes")
      .update(updateData)
      .eq("id", noteId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating note:", error);
      return { data: null, error: error.message };
    }

    return { data: data as Note, error: null };
  } catch (err) {
    console.error("Unexpected error updating note:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Update note status
 */
export async function updateNoteStatus(
  noteId: string,
  status: NoteStatus
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("notes")
      .update({ status })
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating note status:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error updating note status:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Delete a note
 */
export async function deleteNote(
  noteId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting note:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error deleting note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get notes count by status for the current user
 */
export async function getNotesStats(): Promise<{
  data: { pending: number; in_progress: number; completed: number; cancelled: number; total: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: "Unauthorized" };
    }

    const { data, error } = await supabase
      .from("notes")
      .select("status")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching notes stats:", error);
      return { data: null, error: error.message };
    }

    const stats = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      total: data.length,
    };

    data.forEach((note) => {
      if (note.status in stats) {
        stats[note.status as keyof typeof stats]++;
      }
    });

    return { data: stats, error: null };
  } catch (err) {
    console.error("Unexpected error fetching notes stats:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
