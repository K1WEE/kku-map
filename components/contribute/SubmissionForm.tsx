"use client";

import { useEffect, useState } from "react";
import ImageUploader from "@/components/contribute/ImageUploader";
import type { Place } from "@/lib/types";
import type { PlacePayload } from "@/lib/admin/schemas";
import { isShortMapsUrl, parseMapsUrl } from "@/lib/parseMapsUrl";

interface Props {
  initial?: Place | null;
  /** Lifted coords — owned by the page so the map can share them. */
  lat: number | null;
  lng: number | null;
  /** Auth user id — needed by ImageUploader for the per-user storage path. */
  userId: string;
  onCoordChange: (lat: number | null, lng: number | null) => void;
  onSubmit: (payload: PlacePayload, note: string) => Promise<void>;
  onCancel: () => void;
}

const INPUT_BASE =
  "w-full rounded-xl bg-(--color-ink-0) px-3 py-2 text-[14px] text-(--color-ink-800) ring-1 ring-(--color-ink-200) transition placeholder:text-(--color-ink-400) focus:outline-none focus:ring-2 focus:ring-(--color-brand-600)";
const LABEL_BASE = "block text-[12px] font-medium text-(--color-ink-600)";

/**
 * Trimmed submission form: 4 fields the user actually has to fill.
 *   1. name
 *   2. description
 *   3. Google Maps link  → parsed to lat/lng (we accept long + short links)
 *   4. image upload
 *
 * Everything else (nameEn, faculty, category, aliases) is left for the admin
 * to set at approve-time. We default `category` to "landmark" in the payload
 * so the row stays valid.
 *
 * The form owns the Maps-link text; coords are LIFTED to the page so the map
 * preview can show a draggable marker as the URL is parsed.
 */
function PreviousValueHint({
  initial,
  current,
}: {
  initial: string | undefined;
  current: string;
}) {
  if (initial === undefined) return null;
  if (initial === current) return null;
  return (
    <p className="mt-1 text-[11px] text-(--color-ink-500)">
      เดิม:{" "}
      <span className="text-(--color-ink-600)">
        {initial ? initial : <em className="italic opacity-70">(ว่าง)</em>}
      </span>
    </p>
  );
}

export default function SubmissionForm({
  initial,
  lat,
  lng,
  userId,
  onCoordChange,
  onSubmit,
  onCancel,
}: Props) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [mapsUrl, setMapsUrl] = useState("");
  const [resolvingUrl, setResolvingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(initial?.image ?? null);
  const [website, setWebsite] = useState(""); // honeypot
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce-resolve the URL field. Long URLs parse instantly client-side;
  // short links bounce through the server endpoint. Empty input clears the
  // error without touching coords (user might still be typing).
  useEffect(() => {
    const raw = mapsUrl.trim();
    if (!raw) {
      setUrlError(null);
      setResolvingUrl(false);
      return;
    }

    const direct = parseMapsUrl(raw);
    if (direct) {
      setUrlError(null);
      setResolvingUrl(false);
      onCoordChange(direct.lat, direct.lng);
      return;
    }

    if (!isShortMapsUrl(raw)) {
      setUrlError(
        "ลิงก์ใช้ไม่ได้ — paste ลิงก์จาก Google Maps (ปุ่ม Share) หรือพิกัด lat,lng",
      );
      setResolvingUrl(false);
      return;
    }

    // Short link → resolve through the server (debounced).
    setResolvingUrl(true);
    setUrlError(null);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/resolve-maps-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: raw }),
        });
        const data = (await res.json()) as {
          lat?: number;
          lng?: number;
          error?: string;
        };
        if (!res.ok || data.lat === undefined || data.lng === undefined) {
          setUrlError(data.error ?? "หาพิกัดจากลิงก์ไม่ได้");
          return;
        }
        onCoordChange(data.lat, data.lng);
      } catch {
        setUrlError("เครือข่ายขัดข้อง ลองใหม่อีกครั้ง");
      } finally {
        setResolvingUrl(false);
      }
    }, 500);

    return () => clearTimeout(handle);
    // onCoordChange is stable enough (set by parent on each render) — leaving
    // it out keeps this effect from re-running on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("กรอกชื่อสถานที่");
      return;
    }
    if (lat === null || lng === null) {
      setError("ใส่ลิงก์ Google Maps หรือพิกัดที่ถูกต้อง");
      return;
    }
    if (website) {
      // honeypot tripped — silently succeed
      onCancel();
      return;
    }

    const payload: PlacePayload = {
      name: name.trim(),
      // Category is admin's call. Default "landmark" keeps the row valid;
      // admin can flip it at approval.
      category: initial?.category ?? "landmark",
      lat,
      lng,
      ...(description.trim() && { description: description.trim() }),
      ...(image && { image }),
      // Preserve the unedited fields on edit submissions so admin sees
      // them in the diff view (and can keep them by default).
      ...(initial?.nameEn && { nameEn: initial.nameEn }),
      ...(initial?.faculty && { faculty: initial.faculty }),
      ...(initial?.aliases && { aliases: initial.aliases }),
    };

    setSaving(true);
    try {
      await onSubmit(payload, "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งไม่สำเร็จ");
      setSaving(false);
    }
  }

  const coordsReady = lat !== null && lng !== null;

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <label className={LABEL_BASE} htmlFor="sub-name">
            ชื่อสถานที่ <span className="text-(--color-brand-600)">*</span>
          </label>
          <input
            id="sub-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-1 ${INPUT_BASE}`}
            placeholder="เช่น อาคารเรียนรวม 1"
            required
          />
          <PreviousValueHint initial={initial?.name} current={name} />
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="sub-desc">
            คำอธิบาย
          </label>
          <textarea
            id="sub-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`mt-1 ${INPUT_BASE} resize-y`}
            placeholder="ที่นี่คืออะไร? ใช้ทำอะไร?"
          />
          <PreviousValueHint
            initial={initial?.description}
            current={description}
          />
        </div>

        <div>
          <label className={LABEL_BASE} htmlFor="sub-maps-url">
            ลิงก์ Google Maps{" "}
            <span className="text-(--color-brand-600)">*</span>
          </label>
          <input
            id="sub-maps-url"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            className={`mt-1 ${INPUT_BASE}`}
            placeholder="https://maps.app.goo.gl/… หรือ 16.4734, 102.8238"
            inputMode="url"
            autoComplete="off"
          />
          <p className="mt-1 text-[11px] text-(--color-ink-500)">
            เปิด Google Maps ที่สถานที่นั้น → กด <strong>Share</strong> → Copy link → paste ที่นี่
          </p>
          {resolvingUrl && (
            <p className="mt-1 text-[12px] text-(--color-ink-600)">
              กำลังอ่านลิงก์...
            </p>
          )}
          {urlError && (
            <p
              role="alert"
              className="mt-1 text-[12px] text-(--color-brand-700)"
            >
              {urlError}
            </p>
          )}
          {coordsReady && !resolvingUrl && !urlError && (
            <p className="mt-1 text-[12px] text-(--color-ink-600)">
              ได้พิกัดแล้ว:{" "}
              <span className="font-mono text-(--color-ink-800)">
                {lat!.toFixed(5)}, {lng!.toFixed(5)}
              </span>{" "}
              <span className="text-(--color-ink-500)">— ดูจุดบนแผนที่ด้านบน</span>
            </p>
          )}
          {editing && initial && (
            <PreviousValueHint
              initial={`${initial.lat.toFixed(5)}, ${initial.lng.toFixed(5)}`}
              current={
                coordsReady
                  ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`
                  : ""
              }
            />
          )}
        </div>

        <div>
          <p className={LABEL_BASE}>ภาพสถานที่</p>
          <div className="mt-1">
            <ImageUploader
              value={image}
              userId={userId}
              onChange={setImage}
            />
          </div>
          {initial?.image && image !== initial.image && (
            <p className="mt-1 text-[11px] text-(--color-ink-500)">
              เดิมมีรูปอยู่แล้ว — ที่คุณส่งจะแทนของเดิม
            </p>
          )}
        </div>

        {/* Honeypot — invisible to humans, autofilled by bots */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            overflow: "hidden",
          }}
        >
          <label>
            Website (do not fill)
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-(--color-brand-50) px-3 py-2 text-[13px] text-(--color-brand-800)"
          >
            {error}
          </div>
        )}
      </div>

      {/* Sticky submit bar */}
      <div className="border-t border-(--color-ink-100) bg-(--color-ink-0) px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-(--color-brand-600) px-4 py-2.5 text-[14px] font-medium text-white shadow-[0_6px_20px_-8px_oklch(0.44_0.17_25/0.45)] transition hover:bg-(--color-brand-700) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-700) disabled:opacity-60"
          >
            {saving
              ? "กำลังส่ง..."
              : editing
              ? "ส่งคำขอแก้ไข"
              : "ส่งให้ admin รีวิว"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl bg-(--color-ink-100) px-4 py-2.5 text-[14px] font-medium text-(--color-ink-700) transition hover:bg-(--color-ink-200) disabled:opacity-60"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </form>
  );
}
