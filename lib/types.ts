export type CategoryId =
  | "building"
  | "dorm"
  | "food"
  | "library"
  | "landmark";

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
}

export interface Place {
  id: string;
  name: string;
  nameEn?: string;
  faculty?: string;
  category: CategoryId;
  lat: number;
  lng: number;
  description?: string;
  image?: string;
  aliases?: string[];
}

/**
 * Category colors are OKLCH so they hold contrast on a light Positron
 * basemap and stay distinct from the brand maroon (hue ~25). The `glyph`
 * field is a Lucide-style inline SVG path drawn at 24×24 / stroke 2.
 */
export const CATEGORIES: Category[] = [
  { id: "building", label: "ตึกเรียน", icon: "🏛️", color: "oklch(0.50 0.14 250)" },
  { id: "dorm", label: "หอพัก", icon: "🏠", color: "oklch(0.52 0.11 155)" },
  { id: "food", label: "ร้านอาหาร", icon: "🍜", color: "oklch(0.66 0.16 65)" },
  { id: "library", label: "ห้องสมุด", icon: "📚", color: "oklch(0.55 0.11 200)" },
  { id: "landmark", label: "จุดสำคัญ", icon: "📍", color: "oklch(0.56 0.16 350)" },
];

/**
 * A floor/room parsed from a room code (EN140302). Carried alongside a
 * selected building so the place sheet can echo "ชั้น 3 · ห้อง 2" — there is
 * no per-room geometry, the building is still the navigation target.
 */
export interface RoomLocation {
  floor: number;
  room?: number;
}

export interface Zone {
  id: string;
  name: string;
  nameEn?: string;
  color: string;
  polygon: [number, number][];
  aliases?: string[];
}

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<CategoryId, Category>,
);
