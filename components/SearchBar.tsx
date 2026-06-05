"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildFuse, searchPlaces } from "@/lib/search";
import { CATEGORY_MAP, type Place } from "@/lib/types";
import Glyph from "./Glyph";

interface Props {
  places: Place[];
  onSelect: (place: Place) => void;
}

export default function SearchBar({ places, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const fuse = useMemo(() => buildFuse(places), [places]);
  const results = useMemo(() => searchPlaces(fuse, query), [fuse, query]);
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

  function handleSelect(place: Place) {
    onSelect(place);
    setQuery(place.name);
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
              ? `kku-result-${results[active].id}`
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
          placeholder="ค้นหาตึก เช่น EN04, ตึกวิศวะ 4"
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
            results.map((p, i) => {
              const cat = CATEGORY_MAP[p.category];
              const isActive = i === active;
              return (
                <li
                  key={p.id}
                  data-idx={i}
                  role="option"
                  id={`kku-result-${p.id}`}
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(p);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                      isActive ? "bg-(--color-ink-50)" : ""
                    }`}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: cat.color }}
                    >
                      <Glyph id={cat.id} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-(--color-ink-800)">
                        {p.name}
                      </span>
                      <span className="block truncate text-xs text-(--color-ink-500)">
                        {cat.label}
                        {p.nameEn ? ` · ${p.nameEn}` : ""}
                        {p.faculty ? ` · ${p.faculty}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md bg-(--color-ink-100) px-1.5 py-0.5 font-mono text-[10px] text-(--color-ink-600)">
                      {p.id}
                    </span>
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
