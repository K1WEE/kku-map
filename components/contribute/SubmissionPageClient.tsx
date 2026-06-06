"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import SubmissionForm from "@/components/contribute/SubmissionForm";
import type { EditMode } from "@/components/admin/AdminMap";
import type { Place, Zone } from "@/lib/types";
import type { PlacePayload } from "@/lib/admin/schemas";

const AdminMap = dynamic(() => import("@/components/admin/AdminMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-(--color-ink-100) text-sm text-(--color-ink-500)">
      กำลังโหลดแผนที่...
    </div>
  ),
});

interface Props {
  mode: "add" | "edit";
  /** For edit mode: the place being edited (used as the initial form value). */
  initial?: Place | null;
  places: Place[];
  zones: Zone[];
  userId: string;
}

/**
 * Single client shell for both the "เสนอสถานที่ใหม่" and "เสนอแก้ไข" flows.
 * Holds the lifted coords so the map preview moves as the form parses the
 * Google Maps URL, and owns the POST to `/api/submissions`.
 *
 * The map below the form is read-only + drag-fine-tune: clicks don't fire,
 * but the draft marker is draggable so the user can nudge the parsed point
 * if it landed slightly off (Google's URL coords are often near, not exact).
 */
export default function SubmissionPageClient({
  mode,
  initial,
  places,
  zones,
  userId,
}: Props) {
  const router = useRouter();
  const [lat, setLat] = useState<number | null>(initial?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initial?.lng ?? null);

  // Map is purely a preview: idle mode, no click-to-place. The draggable
  // draft marker still works because that's always on in AdminMap.
  const editMode: EditMode = { kind: "idle" };
  const draftMarker = lat !== null && lng !== null ? { lat, lng } : null;

  function setCoords(nextLat: number | null, nextLng: number | null) {
    setLat(nextLat);
    setLng(nextLng);
  }

  async function submit(payload: PlacePayload, note: string) {
    const body =
      mode === "add"
        ? { type: "add", payload, ...(note && { note }) }
        : {
            type: "edit",
            target_place_id: initial?.id,
            payload,
            ...(note && { note }),
          };

    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `ส่งไม่สำเร็จ (${res.status})`);
    }

    router.push("/contribute/mine?sent=1");
  }

  return (
    <main className="flex h-dvh w-dvw flex-col bg-(--color-ink-50)">
      <header className="flex shrink-0 items-center gap-2 border-b border-(--color-ink-100) bg-(--color-ink-0) px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          aria-label="กลับไปหน้าแผนที่"
          className="grid h-9 w-9 place-items-center rounded-full text-(--color-ink-700) transition hover:bg-(--color-ink-100) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-600)"
        >
          <BackIcon />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold text-(--color-ink-900)">
            {mode === "add" ? "เสนอสถานที่ใหม่" : "เสนอแก้ไขสถานที่"}
          </h1>
          {mode === "edit" && initial && (
            <p className="truncate text-[11px] text-(--color-ink-500)">
              {initial.name}
            </p>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="h-[40dvh] shrink-0 md:h-auto md:flex-1">
          <AdminMap
            places={places}
            zones={zones}
            editMode={editMode}
            draftMarker={draftMarker}
            draftPolygon={[]}
            drawingActive={false}
            pickingFromMap={false}
            onMapClick={() => {}}
            onMarkerDrag={(la, ln) => setCoords(la, ln)}
            onVertexDrag={() => {}}
            onSelectPlace={() => {}}
            onSelectZone={() => {}}
          />
        </div>

        <div className="min-h-0 flex-1 md:w-[420px] md:flex-none md:border-l md:border-(--color-ink-100)">
          <SubmissionForm
            initial={initial ?? null}
            lat={lat}
            lng={lng}
            userId={userId}
            onCoordChange={setCoords}
            onSubmit={submit}
            onCancel={() => router.push("/")}
          />
        </div>
      </div>
    </main>
  );
}

function BackIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}
