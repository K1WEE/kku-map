import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createServiceClient } from "@/lib/supabase/server";
import type { SubmissionRow, Profile } from "@/lib/supabase/types";

/**
 * Admin view of all submissions.
 *
 *   GET /api/admin/submissions?status=pending&type=add
 *
 * Both filters optional; default returns pending newest-first. Joins the
 * submitter's email through profiles so the queue UI can show who sent it
 * without an extra round-trip per row.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const type = req.nextUrl.searchParams.get("type"); // null = all

  const svc = createServiceClient();
  let query = svc
    .from("submissions")
    .select("*, submitter:profiles!submissions_submitter_id_fkey(email, display_name)")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (type) query = query.eq("type", type);

  const { data, error } = await query.returns<
    (SubmissionRow & { submitter: Pick<Profile, "email" | "display_name"> | null })[]
  >();

  if (error) {
    console.error("[admin.submissions.GET] failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
