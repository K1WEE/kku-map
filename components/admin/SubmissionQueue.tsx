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
  /** All places, used to resolve "edit" target names for context. */
  places: Place[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, note: string) => Promise<void>;
  /** Tells the row what status filter is active so it can adjust copy. */
  statusFilter: "pending" | "approved" | "rejected" | "all";
}

export default function SubmissionQueue({
  submissions,
  places,
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
  onApprove,
  onReject,
}: {
  submission: AdminSubmission;
  places: Place[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, note: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const payload = (submission.final_payload ?? submission.payload) as Place;
  const targetName =
    submission.type === "edit" && submission.target_place_id
      ? places.find((p) => p.id === submission.target_place_id)?.name
      : null;
  const cat = payload?.category ? CATEGORY_MAP[payload.category] : null;
  const submitterLabel =
    submission.submitter?.display_name || submission.submitter?.email || "—";

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

  const isPending = submission.status === "pending";

  return (
    <article className="rounded-xl bg-(--color-ink-0) ring-1 ring-(--color-ink-200) transition hover:ring-(--color-ink-300)">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
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
          {targetName && (
            <p className="truncate text-[11px] text-(--color-ink-500)">
              แก้ไข: {targetName}
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
            {submission.note && (
              <>
                <dt className="text-(--color-ink-500)">ผู้ส่งบอกว่า</dt>
                <dd className="italic text-(--color-ink-700)">
                  {submission.note}
                </dd>
              </>
            )}
            {submission.reviewer_note && submission.status === "rejected" && (
              <>
                <dt className="text-(--color-ink-500)">เหตุผล reject</dt>
                <dd className="text-(--color-ink-700)">
                  {submission.reviewer_note}
                </dd>
              </>
            )}
          </dl>

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
