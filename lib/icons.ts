import type { CategoryId } from "./types";

/**
 * Lucide-derived path strings for the six categories. Drawn on a 24×24
 * viewbox, stroke 1.75, round join/cap. The marker, search dropdown,
 * and place-sheet chip all share these so a category reads identically
 * everywhere it appears.
 */
export const CATEGORY_GLYPH: Record<CategoryId, string> = {
  building:
    "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18 M2 22h20 M10 6h4 M10 10h4 M10 14h4 M10 18h4",
  faculty:
    "M22 10 12 5 2 10l10 5 10-5v6 M6 12v5c0 2 3 3 6 3s6-1 6-3v-5",
  dorm: "M3 10.5 12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22v-7h6v7",
  food: "M4 3v8a3 3 0 0 0 3 3v8 M10 3v8a3 3 0 0 1-3 3 M7 3v8 M20 3c-2 1-3 4-3 7v4h3v8",
  library:
    "M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z",
  landmark:
    "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

/**
 * Inline SVG markup as a string. Used to inject the glyph into the
 * `L.divIcon` HTML (which only accepts strings). React components use
 * <Glyph /> instead.
 */
export function glyphSvg(id: CategoryId, opts: { size?: number; color?: string } = {}) {
  const size = opts.size ?? 18;
  const color = opts.color ?? "currentColor";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CATEGORY_GLYPH[id]
    .split(/(?=M)/)
    .map((d) => `<path d="${d.trim()}"/>`)
    .join("")}</svg>`;
}
