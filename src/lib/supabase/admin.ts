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
  if (!supabaseServiceRoleKey || supabaseServiceRoleKey === 'your_actual_service_role_key_here') {
    const errorMsg = "SUPABASE_SERVICE_ROLE_KEY is not configured. This key is required for admin operations like creating users. Please add it to your .env.local file.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};