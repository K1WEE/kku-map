import { NextRequest, NextResponse } from "next/server";
import { readZones, writeZones } from "@/lib/admin/dataStore";
import { zoneSchema } from "@/lib/admin/schemas";
import type { Zone } from "@/lib/types";

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  return null;
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

export async function GET() {
  const guard = devOnly();
  if (guard) return guard;
  const zones = await readZones();
  return NextResponse.json(zones);
}

export async function POST(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;
  const body = await req.json();
  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues);
  }
  const zones = await readZones();
  if (zones.some((z) => z.id === parsed.data.id)) {
    return NextResponse.json({ error: "id ซ้ำ" }, { status: 409 });
  }
  const next = [...zones, parsed.data as Zone];
  await writeZones(next);
  return NextResponse.json(parsed.data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;
  const body = await req.json();
  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues);
  }
  const zones = await readZones();
  const idx = zones.findIndex((z) => z.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ error: "ไม่พบ id" }, { status: 404 });
  }
  const next = [...zones];
  next[idx] = parsed.data as Zone;
  await writeZones(next);
  return NextResponse.json(parsed.data);
}

export async function DELETE(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  const zones = await readZones();
  const next = zones.filter((z) => z.id !== id);
  if (next.length === zones.length) {
    return NextResponse.json({ error: "ไม่พบ id" }, { status: 404 });
  }
  await writeZones(next);
  return NextResponse.json({ ok: true });
}
