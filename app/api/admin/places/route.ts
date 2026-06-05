import { NextRequest, NextResponse } from "next/server";
import { readPlaces, writePlaces } from "@/lib/admin/dataStore";
import { placeSchema } from "@/lib/admin/schemas";
import type { Place } from "@/lib/types";

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
  const places = await readPlaces();
  return NextResponse.json(places);
}

export async function POST(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;
  const body = await req.json();
  const parsed = placeSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues);
  }
  const places = await readPlaces();
  if (places.some((p) => p.id === parsed.data.id)) {
    return NextResponse.json({ error: "id ซ้ำ" }, { status: 409 });
  }
  const next = [...places, parsed.data as Place];
  await writePlaces(next);
  return NextResponse.json(parsed.data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;
  const body = await req.json();
  const parsed = placeSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues);
  }
  const places = await readPlaces();
  const idx = places.findIndex((p) => p.id === parsed.data.id);
  if (idx === -1) {
    return NextResponse.json({ error: "ไม่พบ id" }, { status: 404 });
  }
  const next = [...places];
  next[idx] = parsed.data as Place;
  await writePlaces(next);
  return NextResponse.json(parsed.data);
}

export async function DELETE(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }
  const places = await readPlaces();
  const next = places.filter((p) => p.id !== id);
  if (next.length === places.length) {
    return NextResponse.json({ error: "ไม่พบ id" }, { status: 404 });
  }
  await writePlaces(next);
  return NextResponse.json({ ok: true });
}
