import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Reject a pending submission. Stores an optional `reviewer_note` so the
 * user can read why on /contribute/mine, and stamps `reviewer_id` so we
 * keep a clean audit trail.
 */
const rejectBodySchema = z
  .object({
    note: z.string().max(1000).optional(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: submissionId } = await params;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Empty body = reject with no reason. Allowed.
  }
  const parsed = rejectBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const svc = createServiceClient();

  // Load to verify pending status before flipping it. Catches the case where
  // two admins click reject at the same time.
  const { data: submission, error: loadErr } = await svc
    .from("submissions")
    .select("status")
    .eq("id", submissionId)
    .maybeSingle();
  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 });
  }
  if (!submission) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (submission.status !== "pending") {
    return NextResponse.json(
      { error: "submission ถูกรีวิวไปแล้ว", status: submission.status },
      { status: 409 },
    );
  }

  const { error: updErr } = await svc
    .from("submissions")
    .update({
      status: "rejected",
      reviewer_id: auth.userId,
      reviewer_note: parsed.data.note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
