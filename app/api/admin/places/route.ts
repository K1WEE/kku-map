import { NextRequest, NextResponse } from "next/server";
import { placeSchema } from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createServiceClient } from "@/lib/supabase/server";
import {
  placeFromRow,
  rowFromPlace,
  type PlaceRow,
} from "@/lib/supabase/types";
import type { Place } from "@/lib/types";

/**
 * Admin CRUD over the `places` table.
 *
 * Gated by `profiles.is_admin` (via `requireAdmin`). Mutations use the
 * service-role client to bypass RLS, but the guard is the authoritative
 * check — RLS is the second line of defense, not the first.
 */

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

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .returns<PlaceRow[]>();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json((data ?? []).map(placeFromRow));
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const body = await req.json();
  const parsed = placeSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = createServiceClient();
  const row = rowFromPlace(parsed.data as Place);
  const { error } = await supabase.from("places").insert(row);

  if (error) {
    if (error.code === "23505") {
      // unique_violation on primary key
      return NextResponse.json({ error: "id ซ้ำ" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(parsed.data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const body = await req.json();
  const parsed = placeSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = createServiceClient();
  const row = rowFromPlace(parsed.data as Place);
  const { error, count } = await supabase
    .from("places")
    .update(row, { count: "exact" })
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ error: "ไม่พบ id" }, { status: 404 });
  }
  return NextResponse.json(parsed.data);
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { error, count } = await supabase
    .from("places")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ error: "ไม่พบ id" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
