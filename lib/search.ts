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
  places: Place[];
}

export type SearchResult =
  | { kind: "place"; place: Place; score: number }
  | { kind: "zone"; zone: Zone; score: number }
  | { kind: "room"; place: Place; floor: number; room?: number; score: number };

export function buildIndex(places: Place[], zones: Zone[]): SearchIndex {
  return {
    placeFuse: new Fuse(places, PLACE_OPTIONS),
    zoneFuse: new Fuse(zones, ZONE_OPTIONS),
    places,
  };
}

/**
 * KKU room codes pack four fields into a fixed-width string:
 * `EN 14 03 02` → faculty `EN`, building `14`, floor `3`, room `2`.
 * The first four characters (faculty + building) are exactly a place id
 * (`EN14`), so a parsed code resolves to a building we already map; the
 * floor/room tail is metadata we echo back to point students inside it.
 *
 * The room digits are optional so typing feels progressive — `EN1403`
 * resolves the building + floor before the room number is finished. A bare
 * `EN14` (no floor) intentionally does NOT parse here; it falls through to
 * the normal fuzzy building search.
 */
export interface RoomCode {
  faculty: string;
  building: string;
  /** faculty + building, uppercased — matches `Place.id`. */
  buildingId: string;
  floor: number;
  room?: number;
}

export function parseRoomCode(query: string): RoomCode | null {
  const cleaned = query.trim().toUpperCase().replace(/[\s-]+/g, "");
  const m = cleaned.match(/^([A-Z]{2})(\d{2})(\d{2})(\d{2})?$/);
  if (!m) return null;
  const [, faculty, building, floorStr, roomStr] = m;
  return {
    faculty,
    building,
    buildingId: faculty + building,
    floor: parseInt(floorStr, 10),
    room: roomStr ? parseInt(roomStr, 10) : undefined,
  };
}

export function searchAll(
  index: SearchIndex,
  query: string,
  limit = 8,
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  // A room-code query resolves to its building and pins to the top; the score
  // (-1) beats any fuzzy hit. We also remember the building id so the fuzzy
  // pass below doesn't list the same building a second time.
  const roomHits: SearchResult[] = [];
  let roomBuildingId: string | null = null;
  const code = parseRoomCode(q);
  if (code) {
    const place = index.places.find(
      (p) => p.id.toUpperCase() === code.buildingId,
    );
    if (place) {
      roomBuildingId = place.id;
      roomHits.push({
        kind: "room",
        place,
        floor: code.floor,
        room: code.room,
        score: -1,
      });
    }
  }

  const placeHits = index.placeFuse
    .search(q, { limit })
    .filter((r) => r.item.id !== roomBuildingId)
    .map(
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

  return [...roomHits, ...placeHits, ...zoneHits]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
