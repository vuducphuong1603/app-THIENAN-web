import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
}

/**
 * Create a Supabase admin client for server-side operations that require elevated privileges.
 * This client uses the service role key which bypasses Row Level Security.
 * Use this ONLY for admin operations like creating users.
 */
export const createSupabaseAdminClient = () => {
  if (!supabaseServiceRoleKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not configured. Admin operations will use anon key (limited functionality).");
    // Fallback to anon key if service role key is not available
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      throw new Error("Missing both service role key and anon key");
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};