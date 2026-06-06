import { redirect } from "next/navigation";
import SubmissionPageClient from "@/components/contribute/SubmissionPageClient";
import { createClient } from "@/lib/supabase/server";
import {
  placeFromRow,
  zoneFromRow,
  type PlaceRow,
  type ZoneRow,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function NewSubmissionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/contribute/new");

  const [placesRes, zonesRes] = await Promise.all([
    supabase.from("places").select("*").returns<PlaceRow[]>(),
    supabase.from("zones").select("*").returns<ZoneRow[]>(),
  ]);
  const places = placesRes.data?.map(placeFromRow) ?? [];
  const zones = zonesRes.data?.map(zoneFromRow) ?? [];

  return (
    <SubmissionPageClient
      mode="add"
      places={places}
      zones={zones}
      userId={user.id}
    />
  );
}
