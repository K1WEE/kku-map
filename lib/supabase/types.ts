/**
 * Database types — kept hand-written for now. Once the Supabase project is
 * up we can regenerate this via `supabase gen types typescript` to track
 * column drift, but the hand-written shape mirrors `lib/types.ts` so the
 * map and forms keep working without runtime guards.
 */
import type { Place, Zone } from "@/lib/types";

export type SubmissionType = "add" | "edit";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface SubmissionRow {
  id: string;
  type: SubmissionType;
  target_place_id: string | null;
  payload: Place;
  note: string | null;
  status: SubmissionStatus;
  submitter_id: string;
  reviewer_id: string | null;
  reviewer_note: string | null;
  final_payload: Place | null;
  created_at: string;
  reviewed_at: string | null;
}

// Postgres column rows — note snake_case for Supabase JS client
export interface PlaceRow {
  id: string;
  name: string;
  name_en: string | null;
  faculty: string | null;
  category: Place["category"];
  lat: number;
  lng: number;
  description: string | null;
  image: string | null;
  aliases: string[];
  created_at: string;
  updated_at: string;
}

export interface ZoneRow {
  id: string;
  name: string;
  name_en: string | null;
  color: string;
  polygon: [number, number][];
  aliases: string[];
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      places: {
        Row: PlaceRow;
        Insert: Omit<PlaceRow, "created_at" | "updated_at"> &
          Partial<Pick<PlaceRow, "created_at" | "updated_at">>;
        Update: Partial<PlaceRow>;
        Relationships: [];
      };
      zones: {
        Row: ZoneRow;
        Insert: Omit<ZoneRow, "created_at" | "updated_at"> &
          Partial<Pick<ZoneRow, "created_at" | "updated_at">>;
        Update: Partial<ZoneRow>;
        Relationships: [];
      };
      submissions: {
        Row: SubmissionRow;
        Insert: Omit<
          SubmissionRow,
          | "id"
          | "created_at"
          | "status"
          | "reviewer_id"
          | "reviewer_note"
          | "final_payload"
          | "reviewed_at"
        > &
          Partial<Pick<SubmissionRow, "id" | "status">>;
        Update: Partial<SubmissionRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      submission_type: SubmissionType;
      submission_status: SubmissionStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

/**
 * Map a row from Postgres (snake_case, nullable) to the in-app Place type
 * (camelCase-ish, optional fields). Centralized here so any caller that
 * touches the DB stays consistent.
 */
export function placeFromRow(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? undefined,
    faculty: row.faculty ?? undefined,
    category: row.category,
    lat: row.lat,
    lng: row.lng,
    description: row.description ?? undefined,
    image: row.image ?? undefined,
    aliases: row.aliases ?? [],
  };
}

export function zoneFromRow(row: ZoneRow): Zone {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en ?? undefined,
    color: row.color,
    polygon: row.polygon,
    aliases: row.aliases ?? [],
  };
}

/** Inverse of placeFromRow — used by seed and admin writes. */
export function rowFromPlace(p: Place): Omit<PlaceRow, "created_at" | "updated_at"> {
  return {
    id: p.id,
    name: p.name,
    name_en: p.nameEn ?? null,
    faculty: p.faculty ?? null,
    category: p.category,
    lat: p.lat,
    lng: p.lng,
    description: p.description ?? null,
    image: p.image ?? null,
    aliases: p.aliases ?? [],
  };
}

export function rowFromZone(z: Zone): Omit<ZoneRow, "created_at" | "updated_at"> {
  return {
    id: z.id,
    name: z.name,
    name_en: z.nameEn ?? null,
    color: z.color,
    polygon: z.polygon,
    aliases: z.aliases ?? [],
  };
}
