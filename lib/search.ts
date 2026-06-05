import Fuse from "fuse.js";
import placesData from "@/data/places.json";
import type { Place } from "@/lib/types";

export const allPlaces = placesData as Place[];

export const fuse = new Fuse(allPlaces, {
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
});

export function searchPlaces(query: string, limit = 8): Place[] {
  const q = query.trim();
  if (!q) return [];
  return fuse.search(q, { limit }).map((r) => r.item);
}
