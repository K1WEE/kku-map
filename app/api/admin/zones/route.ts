import { NextRequest, NextResponse } from "next/server";
import { zoneSchema } from "@/lib/admin/schemas";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createServiceClient } from "@/lib/supabase/server";
import {
  rowFromZone,
  zoneFromRow,
  type ZoneRow,
} from "@/lib/supabase/types";
import type { Zone } from "@/lib/types";

// See places/route.ts for the gating rationale.

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
    .from("zones")
    .select("*")
    .returns<ZoneRow[]>();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json((data ?? []).map(zoneFromRow));
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const body = await req.json();
  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = createServiceClient();
  const row = rowFromZone(parsed.data as Zone);
  const { error } = await supabase.from("zones").insert(row);

  if (error) {
    if (error.code === "23505") {
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
  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues);

  const supabase = createServiceClient();
  const row = rowFromZone(parsed.data as Zone);
  const { error, count } = await supabase
    .from("zones")
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
    .from("zones")
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
