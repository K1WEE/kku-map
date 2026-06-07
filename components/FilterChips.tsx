"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/types";
import Glyph from "./Glyph";

interface Props {
  active: Set<CategoryId>;
  onToggle: (id: CategoryId) => void;
  showZones: boolean;
  onToggleZones: () => void;
  allOff?: boolean;
}

export default function FilterChips({
  active,
  onToggle,
  showZones,
  onToggleZones,
  allOff = false,
}: Props) {
  const [legendOpen, setLegendOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!legendOpen) return;
    function handleDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setLegendOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLegendOpen(false);
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("touchstart", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("touchstart", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [legendOpen]);

  return (
    <div ref={wrapRef} className="relative space-y-2">
      {allOff && (
        <div
          role="status"
          className="mx-auto w-fit max-w-full rounded-full bg-(--color-ink-900) px-3.5 py-1.5 text-center text-xs font-medium text-(--color-ink-0) shadow-lg"
        >
          ไม่มีหมวดที่เปิดอยู่ · แตะหมวดด้านล่าง
        </div>
      )}

      {/* Legend popover (mobile only — desktop shows labels inline) */}
      <div
        id="kku-filter-legend"
        role="region"
        aria-label="คำอธิบายไอคอนหมวด"
        aria-hidden={!legendOpen}
        className={`absolute inset-x-0 bottom-full mb-2 origin-bottom rounded-2xl bg-(--color-ink-0) p-3 shadow-[0_18px_40px_-12px_oklch(0.2_0.05_25/0.30)] ring-1 ring-(--color-ink-200) transition-[opacity,transform] duration-(--motion-base) [transition-timing-function:var(--ease-out-quart)] sm:hidden ${
          legendOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0"
        }`}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-(--color-ink-500)">
            หมวดสถานที่
          </span>
          <button
            type="button"
            onClick={() => setLegendOpen(false)}
            className="-mr-1 grid h-6 w-6 place-items-center rounded-full text-(--color-ink-500) hover:bg-(--color-ink-100) hover:text-(--color-ink-800)"
            aria-label="ปิด"
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6 18 18 M18 6 6 18" />
            </svg>
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-1.5">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onToggle(c.id)}
                aria-pressed={active.has(c.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-(--color-ink-50) focus-visible:ring-focus"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
                  style={{ background: c.color }}
                >
                  <Glyph id={c.id} size={16} />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[13px] font-medium text-(--color-ink-800)">
                    {c.label}
                  </span>
                  <span
                    className={`text-[10px] ${
                      active.has(c.id)
                        ? "text-(--color-brand-700)"
                        : "text-(--color-ink-500)"
                    }`}
                  >
                    {active.has(c.id) ? "แสดงอยู่" : "ซ่อน · แตะเพื่อเปิด"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onToggleZones}
          aria-pressed={showZones}
          className="mt-2 flex w-full items-center gap-2.5 rounded-lg border border-(--color-ink-200) px-1.5 py-1.5 text-left transition hover:bg-(--color-ink-50) focus-visible:ring-focus"
        >
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
              showZones
                ? "bg-(--color-ink-800) text-white"
                : "bg-(--color-ink-100) text-(--color-ink-500)"
            }`}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 6 9 4l6 2 6-2v14l-6 2-6-2-6 2z" />
              <path d="M9 4v16" />
              <path d="M15 6v16" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[13px] font-medium text-(--color-ink-800)">
              พื้นที่คณะ
            </span>
            <span
              className={`text-[10px] ${
                showZones
                  ? "text-(--color-brand-700)"
                  : "text-(--color-ink-500)"
              }`}
            >
              {showZones
                ? "แสดงขอบเขตคณะบนแผนที่"
                : "ซ่อน · แตะเพื่อเปิด"}
            </span>
          </span>
        </button>
      </div>

      <div
        className="flex items-stretch justify-between gap-1 sm:justify-start sm:gap-1.5"
        role="group"
        aria-label="ตัวกรองหมวด"
      >
        {CATEGORIES.map((c) => {
          const on = active.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggle(c.id)}
              aria-pressed={on}
              aria-label={c.label}
              title={c.label}
              className={`flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium shadow-[0_4px_12px_-4px_oklch(0.2_0.05_25/0.30)] transition-[background,color] duration-150 sm:w-auto sm:px-3 sm:py-2 ${
                on
                  ? "text-white"
                  : "bg-(--color-ink-0) text-(--color-ink-700) ring-1 ring-inset ring-(--color-ink-200)"
              } focus-visible:ring-focus`}
              style={on ? { background: c.color } : { color: c.color }}
            >
              <Glyph id={c.id} size={18} />
              <span
                className={`hidden sm:inline ${
                  on ? "text-white" : "text-(--color-ink-700)"
                }`}
              >
                {c.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onToggleZones}
          aria-pressed={showZones}
          aria-label="แสดงพื้นที่คณะ"
          title="พื้นที่คณะ"
          className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium shadow-[0_4px_12px_-4px_oklch(0.2_0.05_25/0.30)] transition-colors duration-150 sm:px-3 sm:py-2 ${
            showZones
              ? "bg-(--color-ink-800) text-(--color-ink-0)"
              : "bg-(--color-ink-0) text-(--color-ink-700) ring-1 ring-inset ring-(--color-ink-200)"
          } w-10 sm:w-auto focus-visible:ring-focus`}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 6 9 4l6 2 6-2v14l-6 2-6-2-6 2z" />
            <path d="M9 4v16" />
            <path d="M15 6v16" />
          </svg>
          <span className="hidden sm:inline">พื้นที่คณะ</span>
        </button>

        {/* Info button — mobile only (desktop shows labels inline) */}
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          aria-expanded={legendOpen}
          aria-controls="kku-filter-legend"
          aria-label="คำอธิบายไอคอน"
          title="คำอธิบายไอคอน"
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-[0_4px_12px_-4px_oklch(0.2_0.05_25/0.30)] transition-colors duration-150 sm:hidden ${
            legendOpen
              ? "bg-(--color-brand-600) text-white"
              : "bg-(--color-ink-0) text-(--color-ink-700) ring-1 ring-inset ring-(--color-ink-200)"
          } focus-visible:ring-focus`}
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.85}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>
      </div>
    </div>
  );
}
