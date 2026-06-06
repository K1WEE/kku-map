"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  /** Current image URL (public). Null/empty when nothing uploaded yet. */
  value: string | null;
  /** Auth user id — file path is `<uid>/<random>.<ext>` to satisfy storage RLS. */
  userId: string;
  onChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const BUCKET = "submission-images";

/**
 * Single-image upload control. Pushes the file to Supabase Storage via the
 * browser client (RLS gates the write so we don't need a server route), then
 * hands the public URL back through `onChange`.
 *
 * Replace replaces in place; the previous file isn't deleted because reject
 * flows may want to retain it for audit. A Phase-next housekeeping job can
 * sweep orphans.
 */
export default function ImageUploader({ value, userId, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("รับเฉพาะ JPG / PNG / WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("ไฟล์ใหญ่เกิน 5MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? `อัปโหลดล้มเหลว: ${err.message}`
          : "อัปโหลดล้มเหลว",
      );
    } finally {
      setUploading(false);
      // Clear the input so picking the same file again still fires onChange
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function pick() {
    inputRef.current?.click();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {value ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-(--color-ink-200)">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="รูปที่เลือก"
            className="block h-40 w-full object-cover"
          />
          <div className="flex items-center justify-between gap-2 bg-(--color-ink-0) px-3 py-2">
            <span className="text-[12px] text-(--color-ink-500)">
              อัปโหลดแล้ว
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={pick}
                disabled={uploading}
                className="text-[12px] font-medium text-(--color-ink-700) underline-offset-2 transition hover:text-(--color-ink-900) hover:underline disabled:opacity-60"
              >
                เปลี่ยน
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={uploading}
                className="text-[12px] font-medium text-(--color-ink-500) underline-offset-2 transition hover:text-(--color-brand-700) hover:underline disabled:opacity-60"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-(--color-ink-200) bg-(--color-ink-0) text-(--color-ink-600) transition hover:border-(--color-brand-300) hover:bg-(--color-ink-50) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-600) disabled:opacity-60"
        >
          {uploading ? (
            <span className="text-[13px]">กำลังอัปโหลด...</span>
          ) : (
            <>
              <UploadIcon />
              <span className="text-[13px] font-medium">เลือกรูปสถานที่</span>
              <span className="text-[11px] text-(--color-ink-500)">
                JPG / PNG / WebP ไม่เกิน 5MB
              </span>
            </>
          )}
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 text-[12px] text-(--color-brand-700)"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
