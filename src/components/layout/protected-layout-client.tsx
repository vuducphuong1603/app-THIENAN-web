"use client";

import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { NavSection } from "@/components/navigation/types";
import { useAuth } from "@/providers/auth-provider";
import { fetchClasses, fetchSectors, fetchStudentClassPairs, fetchStudents, fetchTeachers } from "@/lib/queries/supabase";
import { AppShell } from "./app-shell";

interface ProtectedLayoutClientProps {
  sections: NavSection[];
  userName?: string;
  roleLabel?: string;
  children: React.ReactNode;
}

export function ProtectedLayoutClient({ sections, userName, roleLabel, children }: ProtectedLayoutClientProps) {
  const { signOut, supabase } = useAuth();
  const queryClient = useQueryClient();

  const availableRoutes = useMemo(() => {
    const set = new Set<string>();
    sections.forEach((section) => {
      section.items?.forEach((item) => {
        if (item.href) {
          set.add(item.href);
        }
      });
    });
    return set;
  }, [sections]);

  const shouldWarmClasses = availableRoutes.has("/classes");
  const shouldWarmStudents = availableRoutes.has("/students");

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const warmup = async () => {
      const tasks = [
        queryClient.prefetchQuery({
          queryKey: ["sectors", "list"],
          queryFn: () => fetchSectors(supabase),
        }),
      ];

      if (shouldWarmClasses || shouldWarmStudents) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: ["classes", "list"],
            queryFn: () => fetchClasses(supabase),
          }),
        );
      }

      if (shouldWarmClasses) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: ["teachers", "list"],
            queryFn: () => fetchTeachers(supabase),
          }),
          queryClient.prefetchQuery({
            queryKey: ["students", "classCounts"],
            queryFn: () => fetchStudentClassPairs(supabase),
          }),
        );
      }

      if (shouldWarmStudents) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: ["students", "list"],
            queryFn: () => fetchStudents(supabase),
          }),
        );
      }

      await Promise.allSettled(tasks);
    };

    const scheduleWarmup = () => {
      const run = () => {
        if (cancelled) return;
        warmup().catch((error) => console.warn("Supabase warmup failed", error));
      };

      if (typeof window === "undefined") {
        return;
      }

      const idleCallback = (window as typeof window & {
        requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => number;
      }).requestIdleCallback;
      if (idleCallback) {
        const handle = idleCallback(run, { timeout: 1500 });
        cleanup = () => {
          const cancelIdle =
            (window as typeof window & { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback;
          if (cancelIdle) {
            cancelIdle(handle);
          }
        };
        return;
      }

      const timeoutId = window.setTimeout(run, 600);
      cleanup = () => window.clearTimeout(timeoutId);
    };

    scheduleWarmup();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [queryClient, supabase, shouldWarmClasses, shouldWarmStudents]);

  return (
    <AppShell sections={sections} userName={userName} roleLabel={roleLabel} onSignOut={signOut}>
      {children}
    </AppShell>
  );
}
