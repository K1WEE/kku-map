"use client";

import Link from "next/link";

/**
 * Floating action button for "เสนอสถานที่ใหม่" — sits above the FilterChips
 * strip in the bottom-right safe zone. Circle on mobile, pill with label
 * from md+ where there's room for the copy without crowding the chrome.
 */
export default function SuggestFab() {
  return (
    <Link
      href="/contribute/new"
      aria-label="เสนอสถานที่ใหม่"
      className="fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-(--z-chrome) inline-flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-(--color-brand-600) text-white shadow-[0_10px_28px_-8px_oklch(0.44_0.17_25/0.55)] ring-1 ring-(--color-brand-700)/30 transition hover:bg-(--color-brand-700) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-700) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-ink-0) md:w-auto md:px-5"
    >
      <PlusIcon />
      <span className="hidden text-[14px] font-medium whitespace-nowrap md:inline">
        เสนอสถานที่ใหม่
      </span>
    </Link>
  );
}

function PlusIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
