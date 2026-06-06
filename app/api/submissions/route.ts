import { NextRequest, NextResponse } from "next/server";
import { submissionSchema } from "@/lib/admin/schemas";
import { createClient } from "@/lib/supabase/server";
import type { SubmissionRow } from "@/lib/supabase/types";

/**
 * User submission API.
 *
 * POST  /api/submissions           — create a pending submission (auth required)
 * GET   /api/submissions           — list the caller's submissions, newest first
 *
 * The user-bound Supabase client is used on purpose — RLS enforces:
 *   - insert.submitter_id must equal auth.uid()
 *   - select returns only rows the caller owns (admin uses a different policy)
 *
 * Rate-limiting (10 pending per user) is enforced by a Postgres trigger so we
 * never need to maintain a counter app-side; we just translate the trigger's
 * `check_violation` into a 429.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ต้องเข้าสู่ระบบก่อนส่ง suggestion" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues);
  }

  // Honeypot: schema accepts only empty `website`; a bot autofilling the form
  // will set it and fail validation upstream. This branch is the belt-and-
  // braces check in case a schema change ever loosens the field.
  if (
    "website" in parsed.data &&
    parsed.data.website &&
    parsed.data.website.length > 0
  ) {
    // Pretend success so bots don't learn the honeypot exists.
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const row = {
    type: parsed.data.type,
    target_place_id:
      parsed.data.type === "edit" ? parsed.data.target_place_id : null,
    payload: parsed.data.payload,
    note: parsed.data.note ?? null,
    submitter_id: user.id,
  };

  const { data, error } = await supabase
    .from("submissions")
    .insert(row)
    .select()
    .single<SubmissionRow>();

  if (error) {
    if (error.message.includes("submission_limit_exceeded")) {
      return NextResponse.json(
        {
          error:
            "คุณมี submission รอ review อยู่ 10 อันแล้ว — รอ admin รีวิวก่อนนะ",
        },
        { status: 429 },
      );
    }
    console.error("[submissions.POST] insert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ต้องเข้าสู่ระบบ" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("submitter_id", user.id)
    .order("created_at", { ascending: false })
    .returns<SubmissionRow[]>();

  if (error) {
    console.error("[submissions.GET] select failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

function validationError(issues: unknown): NextResponse {
  const list = Array.isArray(issues) ? issues : [];
  const msg = list
    .map((i: { path?: (string | number)[]; message?: string }) => {
      const field = i.path?.join(".") ?? "";
      return field ? `${field}: ${i.message}` : i.message;
    })
    .filter(Boolean)
    .join("; ");
  return NextResponse.json(
    { error: msg || "validation", issues: list },
    { status: 400 },
  );
}
