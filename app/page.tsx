import HomeClient from "@/components/HomeClient";
import { createClient } from "@/lib/supabase/server";
import {
  placeFromRow,
  zoneFromRow,
  type PlaceRow,
  type ZoneRow,
} from "@/lib/supabase/types";

// Always fetch fresh from DB. Supabase Realtime takes over after first paint
// to keep markers live without polling.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Belt-and-braces guard: if Supabase env is missing in this environment
  // (e.g. Vercel preview without the secret set yet) we render an empty map
  // instead of letting the SSR crash with a generic 500. The user gets a
  // working chrome they can still interact with, and the server log lands a
  // single clear line about WHY the data is empty.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error(
      "[/] Supabase env missing — rendering empty map. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return <HomeClient places={[]} zones={[]} />;
  }

  const supabase = await createClient();

  let places: ReturnType<typeof placeFromRow>[] = [];
  let zones: ReturnType<typeof zoneFromRow>[] = [];
  try {
    const [placesRes, zonesRes] = await Promise.all([
      supabase.from("places").select("*").returns<PlaceRow[]>(),
      supabase.from("zones").select("*").returns<ZoneRow[]>(),
    ]);
    if (placesRes.error) console.error("[/] places fetch failed", placesRes.error);
    if (zonesRes.error) console.error("[/] zones fetch failed", zonesRes.error);
    places = placesRes.data?.map(placeFromRow) ?? [];
    zones = zonesRes.data?.map(zoneFromRow) ?? [];
  } catch (err) {
    console.error("[/] Supabase fetch threw", err);
  }

  return <HomeClient places={places} zones={zones} />;
}
