"use client";

import { useState } from "react";
import { CATEGORY_MAP, type Place } from "@/lib/types";
import StatusBadge from "@/components/contribute/StatusBadge";
import type { SubmissionRow, Profile } from "@/lib/supabase/types";

export type AdminSubmission = SubmissionRow & {
  submitter: Pick<Profile, "email" | "display_name"> | null;
};

interface Props {
  submissions: AdminSubmission[];
  /** All places — used to resolve "edit" target names for diff context. */
  places: Place[];
  /** Currently-expanded submission id (single-open accordion). */
  previewId: string | null;
  /** Toggle the open row; passing null collapses everything. */
  onTogglePreview: (submission: AdminSubmission | null) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, note: string) => Promise<void>;
  /** Tells the row what status filter is active so it can adjust copy. */
  statusFilter: "pending" | "approved" | "rejected" | "all";
}

export default function SubmissionQueue({
  submissions,
  places,
  previewId,
  onTogglePreview,
  onApprove,
  onReject,
  statusFilter,
}: Props) {
  if (submissions.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-[14px] text-(--color-ink-700)">
          {statusFilter === "pending"
            ? "ไม่มี submission รอ review 🎉"
            : "ไม่มีรายการ"}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 p-2">
      {submissions.map((s) => (
        <li key={s.id}>
          <SubmissionRowCard
            submission={s}
            places={places}
            expanded={s.id === previewId}
            onToggle={() => onTogglePreview(s.id === previewId ? null : s)}
            onApprove={onApprove}
            onReject={onReject}
          />
        </li>
      ))}
    </ul>
  );
}

function SubmissionRowCard({
  submission,
  places,
  expanded,
  onToggle,
  onApprove,
  onReject,
}: {
  submission: AdminSubmission;
  places: Place[];
  expanded: boolean;
  onToggle: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, note: string) => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const payload = (submission.final_payload ?? submission.payload) as Place;
  const originalPlace =
    submission.type === "edit" && submission.target_place_id
      ? places.find((p) => p.id === submission.target_place_id) ?? null
      : null;
  const cat = payload?.category ? CATEGORY_MAP[payload.category] : null;
  const submitterLabel =
    submission.submitter?.display_name || submission.submitter?.email || "—";
  const isPending = submission.status === "pending";

  async function handleApprove() {
    setError(null);
    setWorking(true);
    try {
      await onApprove(submission.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "อนุมัติล้มเหลว");
      setWorking(false);
    }
  }

  async function handleReject() {
    setError(null);
    setWorking(true);
    try {
      await onReject(submission.id, rejectNote.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "ไม่อนุมัติล้มเหลว");
      setWorking(false);
    }
  }

  return (
    <article className="rounded-xl bg-(--color-ink-0) ring-1 ring-(--color-ink-200) transition hover:ring-(--color-ink-300)">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-600) focus-visible:rounded-xl"
        aria-expanded={expanded}
      >
        <span
          aria-hidden
          className="mt-0.5 inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-(--color-ink-100) text-base"
        >
          {submission.type === "add" ? "🆕" : "✏️"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-tight text-(--color-ink-500)">
              {submission.type === "add" ? "เพิ่มใหม่" : "แก้ไข"}
            </span>
            <StatusBadge status={submission.status} />
          </div>
          <p className="mt-0.5 truncate text-[14px] font-medium text-(--color-ink-900)">
            {payload?.name ?? "(ไม่มีชื่อ)"}
          </p>
          {originalPlace && (
            <p className="truncate text-[11px] text-(--color-ink-500)">
              แก้ไข: {originalPlace.name}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-(--color-ink-500)">
            {submitterLabel} · {relativeTime(submission.created_at)}
          </p>
        </div>
        <span
          aria-hidden
          className={`mt-1 text-(--color-ink-400) transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="border-t border-(--color-ink-100) px-3 py-3 text-[12px]">
          {originalPlace ? (
            <EditDiff original={originalPlace} proposed={payload} />
          ) : (
            <AddSummary payload={payload} cat={cat} />
          )}

          {submission.note && (
            <div className="mt-3 rounded-md bg-(--color-ink-50) px-2.5 py-2">
              <p className="text-[10px] font-medium uppercase tracking-tight text-(--color-ink-500)">
                ผู้ส่งบอกว่า
              </p>
              <p className="mt-0.5 italic text-(--color-ink-700)">
                {submission.note}
              </p>
            </div>
          )}

          {submission.reviewer_note && submission.status === "rejected" && (
            <div className="mt-3 rounded-md bg-(--color-ink-50) px-2.5 py-2">
              <p className="text-[10px] font-medium uppercase tracking-tight text-(--color-ink-500)">
                เหตุผล reject
              </p>
              <p className="mt-0.5 text-(--color-ink-700)">
                {submission.reviewer_note}
              </p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-md bg-(--color-brand-50) px-2 py-1.5 text-(--color-brand-800)"
            >
              {error}
            </p>
          )}

          {isPending && !rejectMode && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={working}
                className="flex-1 rounded-lg bg-(--color-brand-600) px-3 py-2 text-[13px] font-medium text-white transition hover:bg-(--color-brand-700) disabled:opacity-60"
              >
                ✓ อนุมัติ
              </button>
              <button
                type="button"
                onClick={() => setRejectMode(true)}
                disabled={working}
                className="rounded-lg bg-(--color-ink-100) px-3 py-2 text-[13px] font-medium text-(--color-ink-700) transition hover:bg-(--color-ink-200) disabled:opacity-60"
              >
                ✕ ไม่อนุมัติ
              </button>
            </div>
          )}

          {isPending && rejectMode && (
            <div className="mt-3 space-y-2">
              <label
                className="block text-[11px] font-medium text-(--color-ink-600)"
                htmlFor={`reject-note-${submission.id}`}
              >
                เหตุผล (optional — user จะเห็น)
              </label>
              <textarea
                id={`reject-note-${submission.id}`}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="เช่น พิกัดไม่ตรงสถานที่ ลองตรวจดูอีกครั้ง"
                className="w-full rounded-lg bg-(--color-ink-0) px-2 py-1.5 text-[12px] ring-1 ring-(--color-ink-200) focus:outline-none focus:ring-2 focus:ring-(--color-brand-600)"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={working}
                  className="flex-1 rounded-lg bg-(--color-ink-800) px-3 py-2 text-[13px] font-medium text-white transition hover:bg-(--color-ink-900) disabled:opacity-60"
                >
                  ยืนยันไม่อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectMode(false);
                    setRejectNote("");
                  }}
                  disabled={working}
                  className="rounded-lg bg-(--color-ink-100) px-3 py-2 text-[13px] font-medium text-(--color-ink-700) transition hover:bg-(--color-ink-200) disabled:opacity-60"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Compact summary used for new-place submissions where there's no diff. */
function AddSummary({
  payload,
  cat,
}: {
  payload: Place;
  cat: { label: string } | null;
}) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5">
      {cat && (
        <>
          <dt className="text-(--color-ink-500)">หมวด</dt>
          <dd className="text-(--color-ink-800)">{cat.label}</dd>
        </>
      )}
      <dt className="text-(--color-ink-500)">พิกัด</dt>
      <dd className="font-mono text-(--color-ink-800)">
        {payload?.lat?.toFixed(5)}, {payload?.lng?.toFixed(5)}
      </dd>
      {payload?.description && (
        <>
          <dt className="text-(--color-ink-500)">คำอธิบาย</dt>
          <dd className="text-(--color-ink-800)">{payload.description}</dd>
        </>
      )}
      {payload?.image && (
        <>
          <dt className="text-(--color-ink-500)">รูป</dt>
          <dd>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payload.image}
              alt=""
              className="mt-0.5 h-24 w-full max-w-[200px] rounded-md object-cover ring-1 ring-(--color-ink-200)"
            />
          </dd>
        </>
      )}
    </dl>
  );
}

/**
 * Field-by-field diff for edit submissions. We surface ONLY the rows that
 * changed — no point reading a stable name twice. Categorical/coord fields
 * compare strictly; image is opt-in (admin checks the thumbnail).
 */
function EditDiff({
  original,
  proposed,
}: {
  original: Place;
  proposed: Place;
}) {
  const fields: { key: keyof Place; label: string }[] = [
    { key: "name", label: "ชื่อ" },
    { key: "nameEn", label: "ชื่อ (En)" },
    { key: "faculty", label: "คณะ" },
    { key: "category", label: "หมวด" },
    { key: "description", label: "คำอธิบาย" },
  ];

  const rows = fields
    .map(({ key, label }) => {
      const oldRaw = original[key];
      const newRaw = proposed[key];
      if (
        (oldRaw == null || oldRaw === "") &&
        (newRaw == null || newRaw === "")
      )
        return null;
      if (oldRaw === newRaw) return null;
      const oldText =
        key === "category"
          ? CATEGORY_MAP[oldRaw as Place["category"]]?.label ?? String(oldRaw)
          : String(oldRaw ?? "");
      const newText =
        key === "category"
          ? CATEGORY_MAP[newRaw as Place["category"]]?.label ?? String(newRaw)
          : String(newRaw ?? "");
      return { key, label, oldText, newText };
    })
    .filter((r): r is { key: keyof Place; label: string; oldText: string; newText: string } => r !== null);

  const coordsChanged =
    original.lat !== proposed.lat || original.lng !== proposed.lng;
  const distanceMeters =
    coordsChanged && proposed.lat && proposed.lng
      ? haversineMeters(original.lat, original.lng, proposed.lat, proposed.lng)
      : 0;
  const imageChanged = (original.image ?? "") !== (proposed.image ?? "");

  const nothingChanged =
    rows.length === 0 && !coordsChanged && !imageChanged;

  if (nothingChanged) {
    return (
      <p className="rounded-md bg-(--color-ink-50) px-2.5 py-2 text-(--color-ink-600)">
        ไม่มีฟิลด์ที่เปลี่ยน (อาจส่งโดยไม่ตั้งใจ)
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => (
            <DiffRow
              key={String(r.key)}
              label={r.label}
              oldText={r.oldText}
              newText={r.newText}
            />
          ))}
        </ul>
      )}

      {coordsChanged && (
        <DiffRow
          label="พิกัด"
          oldText={`${original.lat.toFixed(5)}, ${original.lng.toFixed(5)}`}
          newText={`${proposed.lat.toFixed(5)}, ${proposed.lng.toFixed(5)}`}
          extra={
            distanceMeters > 0
              ? `ขยับ ${Math.round(distanceMeters)} m`
              : undefined
          }
        />
      )}

      {imageChanged && (
        <li className="list-none">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-tight text-(--color-ink-500)">
            รูป
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ImageSide label="เดิม" url={original.image} muted />
            <ImageSide label="ที่เสนอ" url={proposed.image} />
          </div>
        </li>
      )}
    </div>
  );
}

function DiffRow({
  label,
  oldText,
  newText,
  extra,
}: {
  label: string;
  oldText: string;
  newText: string;
  extra?: string;
}) {
  return (
    <li className="list-none">
      <p className="text-[10px] font-medium uppercase tracking-tight text-(--color-ink-500)">
        {label}
        {extra && (
          <span className="ml-2 normal-case font-normal text-(--color-ink-400)">
            {extra}
          </span>
        )}
      </p>
      <p className="mt-0.5 truncate text-(--color-ink-500) line-through">
        {oldText || "(ว่าง)"}
      </p>
      <p className="rounded-sm bg-(--color-brand-50)/60 px-1 text-(--color-ink-900)">
        {newText || "(ว่าง)"}
      </p>
    </li>
  );
}

function ImageSide({
  label,
  url,
  muted = false,
}: {
  label: string;
  url: string | undefined;
  muted?: boolean;
}) {
  return (
    <div>
      <p
        className={`mb-1 text-[10px] ${muted ? "text-(--color-ink-500)" : "text-(--color-ink-700)"}`}
      >
        {label}
      </p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className={`h-24 w-full rounded-md object-cover ring-1 ring-(--color-ink-200) ${muted ? "opacity-70" : ""}`}
        />
      ) : (
        <div className="grid h-24 w-full place-items-center rounded-md bg-(--color-ink-100) text-[11px] text-(--color-ink-500)">
          (ไม่มีรูป)
        </div>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "เพิ่งส่ง";
  if (mins < 60) return `${mins} นาที`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม.`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วัน`;
  return d.toLocaleDateString("th-TH");
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
