import Fuse, { type IFuseOptions } from "fuse.js";
import type { Place, Zone } from "@/lib/types";

/**
 * Search merges two indexes — places and zones — so a query for "วิศวะ"
 * surfaces the engineering polygon the same way "EN04" surfaces a
 * building. Score-blended ranking puts the better match first regardless
 * of which index it came from.
 */

const PLACE_OPTIONS: IFuseOptions<Place> = {
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

const ZONE_OPTIONS: IFuseOptions<Zone> = {
  keys: [
    { name: "name", weight: 1.5 },
    { name: "nameEn", weight: 1 },
    { name: "aliases", weight: 2 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 1,
};

export interface SearchIndex {
  placeFuse: Fuse<Place>;
  zoneFuse: Fuse<Zone>;
}

export type SearchResult =
  | { kind: "place"; place: Place; score: number }
  | { kind: "zone"; zone: Zone; score: number };

export function buildIndex(places: Place[], zones: Zone[]): SearchIndex {
  return {
    placeFuse: new Fuse(places, PLACE_OPTIONS),
    zoneFuse: new Fuse(zones, ZONE_OPTIONS),
  };
}

export function searchAll(
  index: SearchIndex,
  query: string,
  limit = 8,
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const placeHits = index.placeFuse.search(q, { limit }).map(
    (r): SearchResult => ({
      kind: "place",
      place: r.item,
      score: r.score ?? 1,
    }),
  );
  const zoneHits = index.zoneFuse.search(q, { limit }).map(
    (r): SearchResult => ({
      kind: "zone",
      zone: r.item,
      score: r.score ?? 1,
    }),
  );

  return [...placeHits, ...zoneHits]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
