"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildIndex, searchAll, type SearchResult } from "@/lib/search";
import { CATEGORY_MAP, type Place, type Zone } from "@/lib/types";
import Glyph from "./Glyph";

interface Props {
  places: Place[];
  zones: Zone[];
  onSelectPlace: (place: Place) => void;
  onSelectZone: (zone: Zone) => void;
}

export default function SearchBar({
  places,
  zones,
  onSelectPlace,
  onSelectZone,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const index = useMemo(() => buildIndex(places, zones), [places, zones]);
  const results = useMemo(() => searchAll(index, query), [index, query]);
  const showDropdown = open && query.trim().length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const li = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`,
    );
    li?.scrollIntoView({ block: "nearest" });
  }, [active, showDropdown]);

  function handleSelect(result: SearchResult) {
    if (result.kind === "zone") {
      onSelectZone(result.zone);
      setQuery(result.zone.name);
    } else {
      // place + room both navigate to the building place
      onSelectPlace(result.place);
      setQuery(result.place.name);
    }
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query) {
        setQuery("");
      } else {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[active]);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center gap-2.5 rounded-2xl bg-(--color-ink-0) px-2.5 py-2 shadow-[0_6px_20px_-8px_oklch(0.2_0.05_25/0.25)] ring-1 transition ${
          focused
            ? "ring-(--color-brand-600) ring-2"
            : "ring-(--color-ink-200)"
        }`}
      >
        {/* KKU monogram — typographic lockup as v1 mark */}
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-(--color-brand-600) text-[13px] font-bold tracking-tight text-white"
          aria-label="KKU Maps"
        >
          KKU
        </span>

        <label className="sr-only" htmlFor="kku-search">
          ค้นหาสถานที่ในมหาวิทยาลัยขอนแก่น
        </label>
        <input
          id="kku-search"
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="kku-search-listbox"
          aria-activedescendant={
            showDropdown && results[active]
              ? `kku-result-${resultId(results[active])}`
              : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          placeholder="ค้นหาตึกหรือรหัสห้อง เช่น EN04, EN140302"
          className="min-w-0 flex-1 bg-transparent text-base text-(--color-ink-800) placeholder:text-(--color-ink-400) focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery("");
              inputRef.current?.focus();
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-(--color-ink-500) hover:bg-(--color-ink-100) hover:text-(--color-ink-800)"
            aria-label="ล้างคำค้นหา"
          >
            <svg
              width={14}
              height={14}
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
        )}
      </div>

      {showDropdown && (
        <ul
          ref={listRef}
          id="kku-search-listbox"
          role="listbox"
          className="absolute inset-x-0 top-full z-(--z-dropdown) mt-2 max-h-[60vh] overflow-y-auto rounded-2xl bg-(--color-ink-0) py-1.5 shadow-[0_18px_40px_-12px_oklch(0.2_0.05_25/0.30)] ring-1 ring-(--color-ink-200)"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-(--color-ink-600)">
              ยังไม่เจอ ลองพิมพ์ชื่อย่อ เช่น{" "}
              <span className="font-medium text-(--color-ink-800)">EN04</span>
            </li>
          ) : (
            results.map((r, i) => {
              const isActive = i === active;
              const id = resultId(r);
              return (
                <li
                  key={`${r.kind}:${id}`}
                  data-idx={i}
                  role="option"
                  id={`kku-result-${id}`}
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(r);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                      isActive ? "bg-(--color-ink-50)" : ""
                    }`}
                  >
                    {r.kind === "place" ? (
                      <PlaceResultRow place={r.place} />
                    ) : r.kind === "room" ? (
                      <RoomResultRow
                        place={r.place}
                        floor={r.floor}
                        room={r.room}
                      />
                    ) : (
                      <ZoneResultRow zone={r.zone} />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function resultId(r: SearchResult): string {
  if (r.kind === "zone") return r.zone.id;
  if (r.kind === "room") {
    return `${r.place.id}-${r.floor}-${r.room ?? ""}`;
  }
  return r.place.id;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function PlaceResultRow({ place }: { place: Place }) {
  const cat = CATEGORY_MAP[place.category];
  return (
    <>
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
        style={{ background: cat?.color ?? "var(--color-ink-400)" }}
      >
        {cat && <Glyph id={cat.id} size={18} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-(--color-ink-800)">
          {place.name}
        </span>
        <span className="block truncate text-xs text-(--color-ink-500)">
          {cat?.label ?? "สถานที่"}
          {place.nameEn ? ` · ${place.nameEn}` : ""}
          {place.faculty ? ` · ${place.faculty}` : ""}
        </span>
      </span>
      <span className="shrink-0 rounded-md bg-(--color-ink-100) px-1.5 py-0.5 font-mono text-[10px] text-(--color-ink-600)">
        {place.id}
      </span>
    </>
  );
}

/**
 * Room result is a parsed code (EN140302) resolved to its building. The main
 * line stays the building name — that's the place we actually navigate to —
 * while the secondary line surfaces the floor/room the code encodes, with a
 * door glyph so it reads as "go inside here" rather than a plain marker.
 */
function RoomResultRow({
  place,
  floor,
  room,
}: {
  place: Place;
  floor: number;
  room?: number;
}) {
  const cat = CATEGORY_MAP[place.category];
  return (
    <>
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
        style={{ background: cat?.color ?? "var(--color-ink-400)" }}
      >
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
          <path d="M3 21h18 M5 21V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16" />
          <path d="M15 12h.01" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-(--color-ink-800)">
          {place.name}
        </span>
        <span className="block truncate text-xs text-(--color-ink-500)">
          ชั้น {floor}
          {room != null ? ` · ห้อง ${room}` : ""}
        </span>
      </span>
      <span className="shrink-0 rounded-md bg-(--color-ink-100) px-1.5 py-0.5 font-mono text-[10px] text-(--color-ink-600)">
        {place.id}
        {pad2(floor)}
        {room != null ? pad2(room) : ""}
      </span>
    </>
  );
}

/**
 * Zone result reads visually distinct from a place result: a polygon-shaped
 * swatch tinted with the zone's own color signals "พื้นที่" instead of a
 * single point, and the secondary line says "พื้นที่คณะ" so the user knows
 * they're picking an area rather than a marker.
 */
function ZoneResultRow({ zone }: { zone: Zone }) {
  return (
    <>
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-2 ring-inset"
        style={{
          background: `color-mix(in oklch, ${zone.color} 18%, transparent)`,
          // ring color matches the zone's brand-side stroke
          // (no token because zones carry arbitrary palette)
          ["--tw-ring-color" as never]: zone.color,
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M5 8 L14 4 L20 9 L19 17 L10 20 L5 15 Z"
            fill={zone.color}
            opacity="0.65"
            stroke={zone.color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-(--color-ink-800)">
          {zone.name}
        </span>
        <span className="block truncate text-xs text-(--color-ink-500)">
          พื้นที่คณะ{zone.nameEn ? ` · ${zone.nameEn}` : ""}
        </span>
      </span>
    </>
  );
}
