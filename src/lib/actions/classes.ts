"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Class, Sector } from "@/types/database";

type RawClassRow = {
  id: string;
  name?: string | null;
  code?: string | number | null;
  sector?: string | null;
  sector_id?: number | null;
  sector_code?: string | null;
  sector_name?: string | null;
  branch?: string | null;
  branch_code?: string | null;
  branch_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

type RawSectorRow = {
  id?: number | null;
  code?: string | null;
  name?: string | null;
};

const SECTOR_LOOKUP: Record<string, Sector> = {
  CHIEN: "CHIÊN",
  CHIÊN: "CHIÊN",
  AU: "ẤU",
  ẤU: "ẤU",
  THIEU: "THIẾU",
  THIẾU: "THIẾU",
  NGHIA: "NGHĨA",
  NGHĨA: "NGHĨA",
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function resolveSectorValue(candidate?: string | null): Sector | null {
  if (!candidate) {
    return null;
  }

  const normalized = normalizeText(candidate);
  if (SECTOR_LOOKUP[normalized]) {
    return SECTOR_LOOKUP[normalized];
  }

  if (normalized.includes("CHIEN")) return "CHIÊN";
  if (normalized.includes("NGHIA")) return "NGHĨA";
  if (normalized.includes("THIEU")) return "THIẾU";
  if (normalized.includes("AU")) return "ẤU";

  return null;
}

function toDisplayName(row: RawClassRow): string {
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (name) {
    return name;
  }

  if (row.code !== null && row.code !== undefined) {
    const code = String(row.code).trim();
    if (code) {
      return code;
    }
  }

  return row.id;
}

function deriveSectorFromRow(
  row: RawClassRow,
  sectorById: Map<number, Sector>,
): Sector | null {
  const directFromId =
    typeof row.sector_id === "number" ? sectorById.get(row.sector_id) ?? null : null;
  if (directFromId) {
    return directFromId;
  }

  const candidateValues = new Set<string>();
  const addCandidate = (value?: string | number | null) => {
    if (value === null || value === undefined) {
      return;
    }
    const strValue = String(value).trim();
    if (strValue) {
      candidateValues.add(strValue);
    }
  };

  addCandidate(row.sector);
  addCandidate(row.sector_code);
  addCandidate(row.sector_name);
  addCandidate(row.branch);
  addCandidate(row.branch_code);
  addCandidate(row.branch_name);
  addCandidate(row.name);
  addCandidate(row.code);

  Object.values(row).forEach((value) => {
    if (typeof value === "string") {
      addCandidate(value);
    }
  });

  for (const candidate of candidateValues) {
    const resolved = resolveSectorValue(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function normalizeClassRow(
  row: RawClassRow,
  sectorById: Map<number, Sector>,
  fallbackSector: Sector,
): Class {
  const inferredSector = deriveSectorFromRow(row, sectorById);
  if (!inferredSector) {
    console.warn("Unable to resolve sector for class; using fallback", row.id);
  }
  const resolvedSector = inferredSector ?? fallbackSector;

  return {
    id: row.id,
    name: toDisplayName(row),
    sector: resolvedSector,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function resolveFallbackSector(sectorById: Map<number, Sector>): Sector {
  const iterator = sectorById.values().next();
  if (iterator.value) {
    return iterator.value;
  }
  return "CHIÊN";
}

const SECTOR_SORT_ORDER: Record<Sector, number> = {
  "CHIÊN": 0,
  "ẤU": 1,
  "THIẾU": 2,
  "NGHĨA": 3,
};

/**
 * Fetch all classes from the database with optional sector filter
 */
export async function fetchClasses(sector?: Sector): Promise<{
  data: Class[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    const [classResponse, sectorResponse] = await Promise.all([
      supabase.from("classes").select("*"),
      supabase.from("sectors").select("id, code, name"),
    ]);

    if (classResponse.error) {
      console.error("Error fetching classes:", classResponse.error);
      return { data: null, error: classResponse.error.message };
    }

    if (sectorResponse.error) {
      console.warn("Error fetching sectors for class mapping:", sectorResponse.error.message);
    }

    const sectorById = new Map<number, Sector>();
    const rawSectors = (sectorResponse.data as RawSectorRow[] | null) ?? [];
    rawSectors.forEach((row) => {
      if (typeof row.id !== "number") {
        return;
      }
      const resolved =
        resolveSectorValue(row.code ?? null) ?? resolveSectorValue(row.name ?? null);
      if (resolved) {
        sectorById.set(row.id, resolved);
      }
    });

    const fallbackSector = resolveFallbackSector(sectorById);

    const rawClasses = (classResponse.data as RawClassRow[] | null) ?? [];
    const normalizedClasses = rawClasses.map((row) =>
      normalizeClassRow(row, sectorById, fallbackSector),
    );

    const filteredClasses = sector
      ? normalizedClasses.filter((cls) => cls.sector === sector)
      : normalizedClasses;

    filteredClasses.sort((a, b) => {
      const sectorDiff = SECTOR_SORT_ORDER[a.sector] - SECTOR_SORT_ORDER[b.sector];
      if (sectorDiff !== 0) {
        return sectorDiff;
      }
      return a.name.localeCompare(b.name, "vi");
    });

    return { data: filteredClasses, error: null };
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

    const [classResponse, sectorResponse] = await Promise.all([
      supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .maybeSingle(),
      supabase.from("sectors").select("id, code, name"),
    ]);

    if (classResponse.error) {
      console.error("Error fetching class:", classResponse.error);
      return { data: null, error: classResponse.error.message };
    }

    if (!classResponse.data) {
      return { data: null, error: null };
    }

    if (sectorResponse.error) {
      console.warn("Error fetching sectors for class mapping:", sectorResponse.error.message);
    }

    const sectorById = new Map<number, Sector>();
    const rawSectors = (sectorResponse.data as RawSectorRow[] | null) ?? [];
    rawSectors.forEach((row) => {
      if (typeof row.id !== "number") {
        return;
      }
      const resolved =
        resolveSectorValue(row.code ?? null) ?? resolveSectorValue(row.name ?? null);
      if (resolved) {
        sectorById.set(row.id, resolved);
      }
    });

    const fallbackSector = resolveFallbackSector(sectorById);

    const normalizedClass = normalizeClassRow(
      classResponse.data as RawClassRow,
      sectorById,
      fallbackSector,
    );

    return { data: normalizedClass, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
