import { NextRequest, NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ParsedGrade = number | null;

type GradeKey =
  | "semester_1_45min"
  | "semester_1_exam"
  | "semester_2_45min"
  | "semester_2_exam";

type GradeColumn =
  | "academic_hk1_fortyfive"
  | "academic_hk1_exam"
  | "academic_hk2_fortyfive"
  | "academic_hk2_exam";

const FIELD_TO_COLUMN: Record<GradeKey, GradeColumn> = {
  semester_1_45min: "academic_hk1_fortyfive",
  semester_1_exam: "academic_hk1_exam",
  semester_2_45min: "academic_hk2_fortyfive",
  semester_2_exam: "academic_hk2_exam",
};

type UpdatePayload = Partial<Record<GradeColumn, ParsedGrade>>;

type SupabaseGradeRow = {
  id: string;
  academic_hk1_fortyfive?: number | string | null;
  academic_hk1_exam?: number | string | null;
  academic_hk2_fortyfive?: number | string | null;
  academic_hk2_exam?: number | string | null;
};

type GradeUpdateResponse = {
  id: string;
  grades: Record<GradeKey, ParsedGrade>;
};

function parseGradeValue(raw: unknown): ParsedGrade | "invalid" {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw === "string" && raw.trim() === "") {
    return null;
  }

  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    return "invalid";
  }

  const normalized = Number(value.toFixed(2));

  if (normalized < 0 || normalized > 10) {
    return "invalid";
  }

  return normalized;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Number(parsed.toFixed(2));
  }
  return null;
}

function mapRowToResponse(row: SupabaseGradeRow): GradeUpdateResponse {
  return {
    id: row.id,
    grades: {
      semester_1_45min: toNumberOrNull(row.academic_hk1_fortyfive),
      semester_1_exam: toNumberOrNull(row.academic_hk1_exam),
      semester_2_45min: toNumberOrNull(row.academic_hk2_fortyfive),
      semester_2_exam: toNumberOrNull(row.academic_hk2_exam),
    },
  };
}

type ResolvedSupabaseClient = {
  client: SupabaseClient;
  sessionUserId: string | null;
  usesServiceRole: boolean;
};

async function resolveSupabaseClient(): Promise<ResolvedSupabaseClient> {
  const serverClient = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await serverClient.auth.getUser();

  if (error) {
    console.warn("Failed to verify user session", error);
  }

  if (!user) {
    return { client: serverClient, sessionUserId: null, usesServiceRole: false };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceRole =
    typeof serviceRoleKey === "string" && serviceRoleKey !== "your_actual_service_role_key_here";

  if (hasServiceRole) {
    try {
      const adminClient = createSupabaseAdminClient();
      return { client: adminClient, sessionUserId: user.id, usesServiceRole: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to initialize Supabase admin client. Falling back to session client.", message);
    }
  }

  return { client: serverClient, sessionUserId: user.id, usesServiceRole: false };
}

async function updateStudentGrades(studentId: string, updates: UpdatePayload) {
  const { client, sessionUserId } = await resolveSupabaseClient();

  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await client
    .from("students")
    .update(updates)
    .eq("id", studentId)
    .select("id, academic_hk1_fortyfive, academic_hk1_exam, academic_hk2_fortyfive, academic_hk2_exam")
    .maybeSingle();

  if (error) {
    console.error("Failed to update student grades:", error);
    return NextResponse.json({ error: error.message ?? "Failed to update grades." }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  return NextResponse.json({ data: mapRowToResponse(data as SupabaseGradeRow) });
}

function extractGradeUpdates(payload: Record<string, unknown>): UpdatePayload | { error: string } {
  const updates: UpdatePayload = {};
  let hasField = false;

  (Object.keys(FIELD_TO_COLUMN) as GradeKey[]).forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      return;
    }
    hasField = true;
    const parsed = parseGradeValue(payload[field]);
    if (parsed === "invalid") {
      throw new Error("Điểm phải nằm trong khoảng từ 0 đến 10.");
    }
    updates[FIELD_TO_COLUMN[field]] = parsed;
  });

  if (!hasField) {
    return { error: "Không có trường điểm hợp lệ được cung cấp." };
  }

  return updates;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const studentId = params?.id;

  if (!studentId) {
    return NextResponse.json({ error: "Thiếu mã thiếu nhi cần cập nhật." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  try {
    const updates = extractGradeUpdates(payload);
    if ("error" in updates) {
      return NextResponse.json({ error: updates.error }, { status: 400 });
    }
    return await updateStudentGrades(studentId, updates);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể xử lý điểm vừa gửi. Vui lòng thử lại.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const PUT = PATCH;
