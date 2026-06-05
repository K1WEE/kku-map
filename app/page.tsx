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
  const supabase = await createClient();

  const [placesRes, zonesRes] = await Promise.all([
    supabase.from("places").select("*").returns<PlaceRow[]>(),
    supabase.from("zones").select("*").returns<ZoneRow[]>(),
  ]);

  // If the DB isn't reachable (e.g. local dev without env set), render an
  // empty map rather than crashing — middleware no-ops on missing env so
  // dev can boot up before Supabase is wired.
  const places = placesRes.data?.map(placeFromRow) ?? [];
  const zones = zonesRes.data?.map(zoneFromRow) ?? [];

  return <HomeClient places={places} zones={zones} />;
}
