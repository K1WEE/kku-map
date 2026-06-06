"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CATEGORY_MAP, type Place } from "@/lib/types";
import Glyph from "./Glyph";

interface Props {
  place: Place | null;
  onClose: () => void;
}

export default function PlaceSheet({ place, onClose }: Props) {
  useEffect(() => {
    if (!place) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [place, onClose]);

  const cat = place ? CATEGORY_MAP[place.category] : null;
  const directionsUrl = place
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
    : "#";
  const mapUrl = place
    ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
    : "#";

  return (
    <>
      <div
        className={`fixed inset-0 z-(--z-sheet-backdrop) bg-[oklch(0.15_0.04_25/0.35)] transition-opacity duration-(--motion-base) ${
          place ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-sheet-title"
        className={`fixed inset-x-0 bottom-0 z-(--z-sheet) mx-auto w-full max-w-screen-sm overflow-hidden rounded-t-3xl bg-(--color-ink-0) shadow-[0_-12px_40px_-8px_oklch(0.15_0.04_25/0.25)] ring-1 ring-(--color-ink-200) transition-transform duration-(--motion-sheet) [transition-timing-function:var(--ease-out-quart)] ${
          place ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="block w-full pt-3 pb-1.5 focus-visible:ring-focus"
          aria-label="ปิด"
        >
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-(--color-ink-200)" />
        </button>

        {place && cat && (
          <div className="max-h-[72vh] overflow-y-auto px-5 pb-7 pt-1">
            {place.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={place.image}
                alt={place.name}
                className="mb-4 h-40 w-full rounded-2xl object-cover ring-1 ring-(--color-ink-200)"
              />
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                  style={{ background: cat.color }}
                >
                  <Glyph id={cat.id} size={15} />
                </span>
                <span className="truncate text-[13px] font-medium text-(--color-ink-600)">
                  {cat.label}
                  {place.faculty ? ` · ${place.faculty}` : ""}
                </span>
              </div>
              <span className="shrink-0 rounded-md bg-(--color-ink-100) px-2 py-0.5 font-mono text-[11px] tracking-tight text-(--color-ink-700)">
                {place.id}
              </span>
            </div>

            <h2
              id="place-sheet-title"
              className="mt-2 text-2xl font-semibold leading-[1.15] tracking-[-0.01em] text-(--color-ink-900) [text-wrap:balance]"
            >
              {place.name}
            </h2>
            {place.nameEn && (
              <p className="mt-1 text-sm text-(--color-ink-500)">
                {place.nameEn}
              </p>
            )}

            {place.description && (
              <p className="mt-3.5 text-[15px] leading-relaxed text-(--color-ink-700) [text-wrap:pretty]">
                {place.description}
              </p>
            )}

            <dl className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-(--color-ink-200) pt-4 text-[13px]">
              <div className="flex items-baseline gap-2">
                <dt className="text-(--color-ink-500)">พิกัด</dt>
                <dd className="font-mono text-(--color-ink-800)">
                  {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                </dd>
              </div>
              {place.faculty && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-(--color-ink-500)">สังกัด</dt>
                  <dd className="text-(--color-ink-800)">{place.faculty}</dd>
                </div>
              )}
            </dl>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-brand-600) px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_-10px_oklch(0.44_0.17_25/0.7)] transition active:translate-y-px active:bg-(--color-brand-700) focus-visible:ring-focus"
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.85}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 22s8-7.582 8-12a8 8 0 0 0-16 0c0 4.418 8 12 8 12z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>นำทางไปที่นี่</span>
            </a>

            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-(--color-ink-600) transition hover:text-(--color-ink-900) focus-visible:ring-focus"
            >
              <span>เปิดใน Google Maps</span>
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.85}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>

            <div className="mt-4 border-t border-(--color-ink-100) pt-3">
              <Link
                href={`/contribute/edit/${encodeURIComponent(place.id)}`}
                className="flex w-full items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[12px] text-(--color-ink-500) transition hover:text-(--color-ink-800) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-600)"
              >
                เห็นข้อมูลผิด? เสนอแก้ไข →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
