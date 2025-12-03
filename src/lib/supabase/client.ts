"use client";

import { createBrowserClient } from "@supabase/ssr";

// Sanitize env vars: remove all control characters, newlines, and whitespace
// that can cause "Invalid value" errors in fetch headers
function sanitizeEnvVar(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Remove all control characters (0x00-0x1F, 0x7F), newlines, carriage returns,
  // and trim whitespace
  return value.replace(/[\x00-\x1F\x7F\r\n]/g, "").trim();
}

const supabaseUrl = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Debug: Log if env vars have unexpected characters
if (typeof window !== "undefined") {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const urlHasIssues = supabaseUrl !== originalUrl;
  const keyHasIssues = supabaseAnonKey !== originalKey;
  if (urlHasIssues || keyHasIssues) {
    console.warn("[Supabase] Environment variables had invalid characters removed:", {
      urlSanitized: urlHasIssues,
      keySanitized: keyHasIssues,
    });
  }
}

export const createSupabaseBrowserClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey);
