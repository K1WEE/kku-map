import { notFound, redirect } from "next/navigation";
import SubmissionPageClient from "@/components/contribute/SubmissionPageClient";
import { createClient } from "@/lib/supabase/server";
import {
  placeFromRow,
  zoneFromRow,
  type PlaceRow,
  type ZoneRow,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/contribute/edit/${encodeURIComponent(placeId)}`);
  }

  const [placesRes, zonesRes] = await Promise.all([
    supabase.from("places").select("*").returns<PlaceRow[]>(),
    supabase.from("zones").select("*").returns<ZoneRow[]>(),
  ]);

  const places = placesRes.data?.map(placeFromRow) ?? [];
  const target = places.find((p) => p.id === placeId);
  if (!target) notFound();

  const zones = zonesRes.data?.map(zoneFromRow) ?? [];

  return (
    <SubmissionPageClient
      mode="edit"
      initial={target}
      places={places}
      zones={zones}
      userId={user.id}
    />
  );
}
