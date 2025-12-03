"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Debug: Log if env vars have unexpected characters
if (typeof window !== "undefined") {
  const urlHasIssues = supabaseUrl !== process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyHasIssues = supabaseAnonKey !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (urlHasIssues || keyHasIssues) {
    console.warn("[Supabase] Environment variables had whitespace trimmed:", {
      urlTrimmed: urlHasIssues,
      keyTrimmed: keyHasIssues,
    });
  }
}

export const createSupabaseBrowserClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey);
