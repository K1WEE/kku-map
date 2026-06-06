"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Place, Zone } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/types";
import PlaceForm from "@/components/admin/PlaceForm";
import ZoneForm from "@/components/admin/ZoneForm";
import SubmissionQueue, {
  type AdminSubmission,
} from "@/components/admin/SubmissionQueue";
import type { EditMode } from "@/components/admin/AdminMap";

const AdminMap = dynamic(() => import("@/components/admin/AdminMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
      กำลังโหลดแผนที่…
    </div>
  ),
});

type Tab = "queue" | "place" | "zone";
type QueueFilter = "pending" | "approved" | "rejected" | "all";

const QUEUE_FILTER_LABEL: Record<QueueFilter, string> = {
  pending: "รอรีวิว",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  all: "ทั้งหมด",
};

function TabButton({
  active,
  onClick,
  label,
  count,
  emphasizeCount = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  /** Use brand pill for non-zero counts (e.g. pending queue). */
  emphasizeCount?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-sm transition ${
        active
          ? "bg-(--color-ink-900) text-(--color-ink-0)"
          : "bg-(--color-ink-100) text-(--color-ink-700) hover:bg-(--color-ink-200)"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0 text-[10px] leading-tight ${
          emphasizeCount && count > 0
            ? "bg-(--color-brand-600) text-white"
            : active
            ? "bg-(--color-ink-700) text-(--color-ink-100)"
            : "bg-(--color-ink-200) text-(--color-ink-600)"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("queue");
  const [places, setPlaces] = useState<Place[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("pending");
  const [previewSubmission, setPreviewSubmission] =
    useState<AdminSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState<EditMode>({ kind: "idle" });
  const [draftMarker, setDraftMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [draftPolygon, setDraftPolygon] = useState<[number, number][]>([]);
  const [pickingFromMap, setPickingFromMap] = useState(false);
  const [drawingActive, setDrawingActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadSubmissions = useCallback(
    async (filter: QueueFilter) => {
      const res = await fetch(
        `/api/admin/submissions?status=${encodeURIComponent(filter)}`,
      );
      if (!res.ok) throw new Error(`submissions: ${res.status}`);
      setSubmissions(await res.json());
    },
    [],
  );

  // Load places + zones once on mount.
  useEffect(() => {
    async function load() {
      try {
        const [p, z] = await Promise.all([
          fetch("/api/admin/places").then((r) => {
            if (!r.ok) throw new Error(`places: ${r.status}`);
            return r.json();
          }),
          fetch("/api/admin/zones").then((r) => {
            if (!r.ok) throw new Error(`zones: ${r.status}`);
            return r.json();
          }),
        ]);
        setPlaces(p);
        setZones(z);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "load failed");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load (and reload) submissions whenever the filter changes. Independent
  // from the places/zones fetch so a queue blip doesn't block the editor.
  useEffect(() => {
    loadSubmissions(queueFilter).catch((e) =>
      console.warn("[admin] queue load failed", e),
    );
  }, [queueFilter, loadSubmissions]);

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === "pending").length,
    [submissions],
  );

  // Preview markers: when the admin opens a queue row the map paints the
  // proposed marker (and for edits the original-position ghost). Anywhere
  // else, fall back to the regular editor draft marker.
  const previewPayload = previewSubmission
    ? ((previewSubmission.final_payload ?? previewSubmission.payload) as Place)
    : null;
  const previewOriginalPlace =
    previewSubmission?.type === "edit" && previewSubmission.target_place_id
      ? places.find((p) => p.id === previewSubmission.target_place_id) ?? null
      : null;
  const inReviewMode = tab === "queue" && previewSubmission !== null;
  const effectiveDraftMarker = inReviewMode
    ? previewPayload && Number.isFinite(previewPayload.lat) && Number.isFinite(previewPayload.lng)
      ? { lat: previewPayload.lat, lng: previewPayload.lng }
      : null
    : draftMarker;
  const effectiveReviewOriginal =
    inReviewMode && previewOriginalPlace
      ? { lat: previewOriginalPlace.lat, lng: previewOriginalPlace.lng }
      : null;

  // Clear preview when leaving the queue tab so the map doesn't keep
  // a phantom marker behind in the place/zone editors.
  useEffect(() => {
    if (tab !== "queue" && previewSubmission) setPreviewSubmission(null);
  }, [tab, previewSubmission]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const existingPlaceIds = useMemo(() => places.map((p) => p.id), [places]);
  const existingZoneIds = useMemo(() => zones.map((z) => z.id), [zones]);
  const existingFaculties = useMemo(
    () => Array.from(new Set(places.map((p) => p.faculty).filter(Boolean))) as string[],
    [places],
  );

  const editingPlace =
    editMode.kind === "edit-place"
      ? places.find((p) => p.id === editMode.id) ?? null
      : null;
  const editingZone =
    editMode.kind === "edit-zone"
      ? zones.find((z) => z.id === editMode.id) ?? null
      : null;

  function resetEditState() {
    setEditMode({ kind: "idle" });
    setDraftMarker(null);
    setDraftPolygon([]);
    setPickingFromMap(false);
    setDrawingActive(false);
  }

  function startAddPlace() {
    resetEditState();
    setEditMode({ kind: "add-place" });
    setPickingFromMap(true);
  }

  function startEditPlace(p: Place) {
    resetEditState();
    setEditMode({ kind: "edit-place", id: p.id });
    setDraftMarker({ lat: p.lat, lng: p.lng });
  }

  function startAddZone() {
    resetEditState();
    setEditMode({ kind: "draw-zone" });
    setDrawingActive(true);
  }

  function startEditZone(z: Zone) {
    resetEditState();
    setEditMode({ kind: "edit-zone", id: z.id });
    setDraftPolygon(z.polygon);
  }

  function handleMapClick(lat: number, lng: number) {
    if (editMode.kind === "add-place" || editMode.kind === "edit-place") {
      setDraftMarker({ lat, lng });
      setPickingFromMap(false);
      return;
    }
    if (editMode.kind === "draw-zone" && drawingActive) {
      setDraftPolygon((prev) => [...prev, [lat, lng]]);
      return;
    }
    if (editMode.kind === "edit-zone" && drawingActive) {
      setDraftPolygon((prev) => [...prev, [lat, lng]]);
      return;
    }
  }

  async function savePlace(place: Place) {
    const method = editMode.kind === "edit-place" ? "PUT" : "POST";
    const res = await fetch("/api/admin/places", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(place),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `บันทึกล้มเหลว (${res.status})`);
    }
    const updated: Place = await res.json();
    setPlaces((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    showToast(`บันทึก "${place.name}" แล้ว`);
    resetEditState();
  }

  async function deletePlace(id: string) {
    const res = await fetch(`/api/admin/places?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `ลบล้มเหลว (${res.status})`);
    }
    setPlaces((prev) => prev.filter((p) => p.id !== id));
    showToast("ลบแล้ว");
    resetEditState();
  }

  async function saveZone(zone: Zone) {
    const method = editMode.kind === "edit-zone" ? "PUT" : "POST";
    const res = await fetch("/api/admin/zones", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(zone),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `บันทึกล้มเหลว (${res.status})`);
    }
    const updated: Zone = await res.json();
    setZones((prev) => {
      const idx = prev.findIndex((z) => z.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
    showToast(`บันทึก "${zone.name}" แล้ว`);
    resetEditState();
  }

  async function approveSubmission(id: string) {
    const res = await fetch(`/api/admin/submissions/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `อนุมัติล้มเหลว (${res.status})`);
    }
    showToast("อนุมัติแล้ว");
    // Refresh both queue and places — approved 'add' inserts a place,
    // approved 'edit' mutates one.
    await Promise.all([
      loadSubmissions(queueFilter),
      fetch("/api/admin/places")
        .then((r) => r.json())
        .then(setPlaces)
        .catch(() => {}),
    ]);
  }

  async function rejectSubmission(id: string, note: string) {
    const res = await fetch(`/api/admin/submissions/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note ? { note } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `ไม่อนุมัติล้มเหลว (${res.status})`);
    }
    showToast("ไม่อนุมัติแล้ว");
    await loadSubmissions(queueFilter);
  }

  async function deleteZone(id: string) {
    const res = await fetch(`/api/admin/zones?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `ลบล้มเหลว (${res.status})`);
    }
    setZones((prev) => prev.filter((z) => z.id !== id));
    showToast("ลบแล้ว");
    resetEditState();
  }

  const showForm =
    editMode.kind === "add-place" ||
    editMode.kind === "edit-place" ||
    editMode.kind === "draw-zone" ||
    editMode.kind === "edit-zone";

  return (
    <div className="flex h-dvh w-full flex-col bg-gray-50 md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full flex-col border-b border-gray-200 bg-white md:w-96 md:border-b-0 md:border-r">
        <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          <h1 className="text-sm font-semibold">KKU Maps — Admin</h1>
          <span className="rounded bg-(--color-brand-50) px-1.5 py-0.5 text-[10px] font-medium text-(--color-brand-700)">
            ADMIN
          </span>
        </header>

        {!showForm && (
          <>
            <div className="flex gap-1 border-b border-gray-200 p-2">
              <TabButton
                active={tab === "queue"}
                onClick={() => setTab("queue")}
                label="คิวรีวิว"
                count={pendingCount}
                emphasizeCount
              />
              <TabButton
                active={tab === "place"}
                onClick={() => setTab("place")}
                label="จุด"
                count={places.length}
              />
              <TabButton
                active={tab === "zone"}
                onClick={() => setTab("zone")}
                label="โซน"
                count={zones.length}
              />
            </div>

            {tab !== "queue" && (
              <div className="border-b border-gray-200 p-2">
                <button
                  onClick={tab === "place" ? startAddPlace : startAddZone}
                  className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  + เพิ่ม{tab === "place" ? "จุด" : "โซน"}ใหม่
                </button>
              </div>
            )}

            {tab === "queue" && (
              <div className="flex items-center gap-1 border-b border-gray-200 px-2 py-2 text-[12px]">
                <span className="mr-1 text-(--color-ink-500)">แสดง:</span>
                {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`rounded-md px-2 py-0.5 transition ${
                      queueFilter === f
                        ? "bg-(--color-ink-900) text-(--color-ink-0)"
                        : "bg-(--color-ink-100) text-(--color-ink-700) hover:bg-(--color-ink-200)"
                    }`}
                  >
                    {QUEUE_FILTER_LABEL[f]}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <p className="text-center text-xs text-gray-500">กำลังโหลด…</p>
              ) : tab === "queue" ? (
                <SubmissionQueue
                  submissions={submissions}
                  places={places}
                  previewId={previewSubmission?.id ?? null}
                  onTogglePreview={setPreviewSubmission}
                  onApprove={approveSubmission}
                  onReject={rejectSubmission}
                  statusFilter={queueFilter}
                />
              ) : tab === "place" ? (
                <ul className="flex flex-col gap-1">
                  {places.map((p) => {
                    const cat = CATEGORY_MAP[p.category];
                    return (
                      <li key={p.id}>
                        <button
                          onClick={() => startEditPlace(p)}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ background: cat?.color }}
                          />
                          <span className="flex-1 truncate">{p.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {p.id}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul className="flex flex-col gap-1">
                  {zones.map((z) => (
                    <li key={z.id}>
                      <button
                        onClick={() => startEditZone(z)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ background: z.color }}
                        />
                        <span className="flex-1 truncate">{z.name}</span>
                        <span className="text-[10px] text-gray-500">
                          {z.polygon.length} จุด
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {(editMode.kind === "add-place" || editMode.kind === "edit-place") && (
          <div className="flex-1 overflow-y-auto">
            <PlaceForm
              initial={editingPlace}
              existingIds={existingPlaceIds}
              existingFaculties={existingFaculties}
              lat={draftMarker?.lat ?? null}
              lng={draftMarker?.lng ?? null}
              pickingFromMap={pickingFromMap}
              onCoordChange={(lat, lng) => {
                if (lat === null || lng === null) {
                  setDraftMarker(null);
                } else {
                  setDraftMarker({ lat, lng });
                }
              }}
              onRequestPickFromMap={() => setPickingFromMap(true)}
              onSubmit={savePlace}
              onCancel={resetEditState}
              onDelete={
                editMode.kind === "edit-place"
                  ? () => deletePlace(editMode.id)
                  : undefined
              }
            />
          </div>
        )}

        {(editMode.kind === "draw-zone" || editMode.kind === "edit-zone") && (
          <div className="flex-1 overflow-y-auto">
            <ZoneForm
              initial={editingZone}
              existingIds={existingZoneIds}
              polygon={draftPolygon}
              drawingActive={drawingActive}
              onStartDrawing={() => setDrawingActive(true)}
              onUndoVertex={() => setDraftPolygon((p) => p.slice(0, -1))}
              onClearPolygon={() => setDraftPolygon([])}
              onSubmit={saveZone}
              onCancel={resetEditState}
              onDelete={
                editMode.kind === "edit-zone"
                  ? () => deleteZone(editMode.id)
                  : undefined
              }
            />
          </div>
        )}
      </aside>

      {/* Map */}
      <main className="relative flex-1">
        <AdminMap
          places={places}
          zones={zones}
          editMode={editMode}
          draftMarker={effectiveDraftMarker}
          reviewOriginal={effectiveReviewOriginal}
          draftPolygon={draftPolygon}
          drawingActive={drawingActive}
          pickingFromMap={pickingFromMap}
          onMapClick={handleMapClick}
          onMarkerDrag={(lat, lng) => setDraftMarker({ lat, lng })}
          onVertexDrag={(i, lat, lng) =>
            setDraftPolygon((prev) => {
              const next = [...prev];
              next[i] = [lat, lng];
              return next;
            })
          }
          onSelectPlace={(id) => {
            const p = places.find((x) => x.id === id);
            if (p) startEditPlace(p);
          }}
          onSelectZone={(id) => {
            const z = zones.find((x) => x.id === id);
            if (z) startEditZone(z);
          }}
        />

        {drawingActive && (editMode.kind === "draw-zone" || editMode.kind === "edit-zone") && (
          <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 gap-2 rounded-lg bg-white px-3 py-2 shadow-lg">
            <span className="text-xs text-gray-600">
              {draftPolygon.length} จุด
            </span>
            <button
              onClick={() => setDraftPolygon((p) => p.slice(0, -1))}
              disabled={draftPolygon.length === 0}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-40"
            >
              ↶ Undo
            </button>
            <button
              onClick={() => setDrawingActive(false)}
              className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
            >
              ✓ เสร็จ
            </button>
          </div>
        )}

        {toast && (
          <div className="absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
