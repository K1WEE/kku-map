import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { placePayloadSchema } from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createServiceClient } from "@/lib/supabase/server";
import { rowFromPlace } from "@/lib/supabase/types";
import type { Place } from "@/lib/types";

/**
 * Approve a pending submission.
 *
 * Body (optional):
 *   { final_payload?: PlacePayload, place_id?: string }
 *
 * If `final_payload` is set, admin edited the proposal before approving and
 * we use it instead of the user-submitted payload (original payload is kept
 * for audit). `place_id` lets the admin override the auto-generated id for
 * "add" submissions; for "edit" the id is locked to `target_place_id`.
 *
 * The two writes (places + submissions) are sequenced, not transactional —
 * Supabase JS doesn't expose multi-table transactions. If the places write
 * succeeds but the submissions update fails we get a place row + a still-
 * pending submission, which an admin can resolve by re-approving. The
 * inverse (submission marked approved, place not created) is far worse, so
 * we order place-write FIRST.
 */
const approveBodySchema = z
  .object({
    final_payload: placePayloadSchema.optional(),
    place_id: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .min(1)
      .optional(),
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
    // Empty body is fine — approving as-is.
  }
  const parsed = approveBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const svc = createServiceClient();
  const { data: submission, error: loadErr } = await svc
    .from("submissions")
    .select("*")
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

  const finalPayload = parsed.data.final_payload ?? submission.payload;

  if (submission.type === "add") {
    const id = parsed.data.place_id ?? generatePlaceId();
    const placeRow = rowFromPlace({ ...(finalPayload as Place), id });
    const { error: insErr } = await svc.from("places").insert(placeRow);
    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json(
          { error: `place id "${id}" มีอยู่แล้ว — ลองใหม่หรือกำหนด place_id เอง` },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  } else {
    // edit
    if (!submission.target_place_id) {
      return NextResponse.json(
        { error: "submission edit ไม่มี target_place_id" },
        { status: 400 },
      );
    }
    const placeRow = rowFromPlace({
      ...(finalPayload as Place),
      id: submission.target_place_id,
    });
    const { error: updErr, count } = await svc
      .from("places")
      .update(placeRow, { count: "exact" })
      .eq("id", submission.target_place_id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    if (!count) {
      return NextResponse.json(
        { error: "ไม่พบ place ที่จะแก้ — อาจถูกลบไปแล้ว" },
        { status: 404 },
      );
    }
  }

  const { error: subErr } = await svc
    .from("submissions")
    .update({
      status: "approved",
      reviewer_id: auth.userId,
      reviewed_at: new Date().toISOString(),
      ...(parsed.data.final_payload && { final_payload: parsed.data.final_payload }),
    })
    .eq("id", submissionId);

  if (subErr) {
    // Place write already landed; surface a 207-ish state for the admin UI.
    console.error("[approve] submission update failed AFTER place write", subErr);
    return NextResponse.json(
      {
        error:
          "อัพเดต submission ล้มเหลวหลังจาก place ลง DB แล้ว — refresh แล้วลองอนุมัติซ้ำได้",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * Mint a place id when admin doesn't supply one. `usub-` prefix marks this
 * as a user-submitted place (distinct from the seed ids like `EN04`).
 */
function generatePlaceId(): string {
  const r = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  return `usub-${r}`;
}
