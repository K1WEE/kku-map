import { z } from "zod";
import { CATEGORIES } from "@/lib/types";

const categoryIds = CATEGORIES.map((c) => c.id) as [string, ...string[]];

export const placeSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9_-]+$/, "id ใช้ได้เฉพาะ A-Z, a-z, 0-9, _ และ -"),
  name: z.string().min(1, "ต้องมีชื่อ"),
  nameEn: z.string().optional(),
  faculty: z.string().optional(),
  category: z.enum(categoryIds as [string, ...string[]]),
  lat: z.number().finite(),
  lng: z.number().finite(),
  description: z.string().optional(),
  image: z.string().optional(),
  aliases: z.array(z.string().min(1)).optional(),
});

export const zoneSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "id ใช้ได้เฉพาะ a-z, 0-9 และ -"),
  name: z.string().min(1, "ต้องมีชื่อ"),
  nameEn: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "color ต้องเป็น hex เช่น #ef4444"),
  polygon: z
    .array(z.tuple([z.number().finite(), z.number().finite()]))
    .min(3, "polygon ต้องมีอย่างน้อย 3 จุด"),
});

export type PlaceInput = z.infer<typeof placeSchema>;
export type ZoneInput = z.infer<typeof zoneSchema>;
