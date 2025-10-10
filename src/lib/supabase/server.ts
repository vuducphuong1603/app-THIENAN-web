import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore
          .getAll()
          .map(({ name, value }) => ({ name, value }));
      },
      /**
       * Supabase rotates refresh tokens on every refresh. Persist the latest
       * tokens whenever the client asks us to set cookies. In React Server
       * Components `cookies()` is read-only, so wrap in try/catch and ignore
       * the error when mutations are not allowed.
      */
      setAll(cookiesToSet) {
        try {
          const mutableCookies = cookieStore as unknown as {
            set?: (cookie: {
              name: string;
              value: string;
              [key: string]: unknown;
            }) => void;
          };
          cookiesToSet.forEach(({ name, value, options }) => {
            mutableCookies.set?.({ name, value, ...(options ?? {}) });
          });
        } catch {
          // noop – we are likely in a read-only cookies() context
        }
      },
    },
  });
};
