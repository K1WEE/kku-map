export type CategoryId =
  | "building"
  | "faculty"
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
  { id: "faculty", label: "คณะ", icon: "🎓", color: "oklch(0.50 0.16 290)" },
  { id: "dorm", label: "หอพัก", icon: "🏠", color: "oklch(0.52 0.11 155)" },
  { id: "food", label: "ร้านอาหาร", icon: "🍜", color: "oklch(0.66 0.16 65)" },
  { id: "library", label: "ห้องสมุด", icon: "📚", color: "oklch(0.55 0.11 200)" },
  { id: "landmark", label: "จุดสำคัญ", icon: "📍", color: "oklch(0.56 0.16 350)" },
];

export interface Zone {
  id: string;
  name: string;
  nameEn?: string;
  color: string;
  polygon: [number, number][];
}

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<CategoryId, Category>,
);
