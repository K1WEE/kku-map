import Fuse, { type IFuseOptions } from "fuse.js";
import type { Place } from "@/lib/types";

const FUSE_OPTIONS: IFuseOptions<Place> = {
  keys: [
    { name: "id", weight: 2 },
    { name: "name", weight: 1.5 },
    { name: "nameEn", weight: 1 },
    { name: "aliases", weight: 2 },
    { name: "description", weight: 0.5 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 1,
};

/**
 * Build a Fuse index for the given places. Use in a `useMemo` keyed on the
 * places array so the index rebuilds when realtime updates arrive.
 */
export function buildFuse(places: Place[]): Fuse<Place> {
  return new Fuse(places, FUSE_OPTIONS);
}

export function searchPlaces(
  fuse: Fuse<Place>,
  query: string,
  limit = 8,
): Place[] {
  const q = query.trim();
  if (!q) return [];
  return fuse.search(q, { limit }).map((r) => r.item);
}
