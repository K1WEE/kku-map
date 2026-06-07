"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import PlaceSheet from "@/components/PlaceSheet";
import AuthButton from "@/components/AuthButton";
import SuggestFab from "@/components/SuggestFab";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import type { FlyTarget } from "@/components/Map";
import { CATEGORIES, type CategoryId, type Place, type Zone } from "@/lib/types";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-(--color-ink-100) text-sm text-(--color-ink-500)">
      กำลังโหลดแผนที่...
    </div>
  ),
});

interface Props {
  places: Place[];
  zones: Zone[];
}

export default function HomeClient({ places, zones }: Props) {
  const router = useRouter();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(
    () => new Set(CATEGORIES.map((c) => c.id)),
  );
  const [showZones, setShowZones] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const [highlightedZoneId, setHighlightedZoneId] = useState<string | null>(null);

  // Realtime: when admin approves/edits a place anywhere, every open map
  // refreshes. router.refresh() re-runs the server component (which fetches
  // from Supabase) without a full reload, so React state — selected place,
  // active filters, hint — survives the update.
  const refresh = useCallback(() => router.refresh(), [router]);
  useRealtimeRefresh({ table: "places", onChange: refresh });
  useRealtimeRefresh({ table: "zones", onChange: refresh });

  function dismissHint() {
    if (!showHint) return;
    setShowHint(false);
  }

  function openPlace(place: Place, opts: { zoom?: number } = {}) {
    if (!activeCategories.has(place.category)) {
      setActiveCategories((prev) => new Set(prev).add(place.category));
    }
    setSelectedPlace(place);
    setFlyTarget({
      kind: "place",
      placeId: place.id,
      zoom: opts.zoom,
      nonce: Date.now(),
    });
    dismissHint();
  }

  function openZone(zone: Zone) {
    // Make sure zones are visible — selecting an invisible zone otherwise
    // flies the camera but draws nothing.
    if (!showZones) setShowZones(true);
    setSelectedPlace(null);
    setFlyTarget({ kind: "zone", zoneId: zone.id, nonce: Date.now() });
    setHighlightedZoneId(zone.id);
    // Auto-clear the highlight after the fly animation so we don't keep a
    // thick stroke permanently. The cleanup is purely cosmetic; if the
    // user navigates again before the timer fires, that override wins.
    window.setTimeout(() => {
      setHighlightedZoneId((current) => (current === zone.id ? null : current));
    }, 3000);
    dismissHint();
  }

  function toggleCategory(id: CategoryId) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    dismissHint();
  }

  const allOff = activeCategories.size === 0;

  return (
    <main className="relative h-dvh w-dvw">
      <Map
        places={places}
        zones={zones}
        flyTarget={flyTarget}
        selectedId={selectedPlace?.id ?? null}
        highlightedZoneId={highlightedZoneId}
        activeCategories={activeCategories}
        showZones={showZones}
        onSelectPlace={(p) => openPlace(p, { zoom: 18 })}
        sheetOffsetRatio={0.17}
      />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-(--z-chrome) px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        onClickCapture={dismissHint}
      >
        <div className="pointer-events-auto mx-auto max-w-screen-sm">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <SearchBar
                places={places}
                zones={zones}
                onSelectPlace={(p) => openPlace(p, { zoom: 18 })}
                onSelectZone={openZone}
              />
            </div>
            <div className="shrink-0">
              <AuthButton />
            </div>
          </div>
          <div
            aria-hidden={!showHint}
            className={`mx-auto mt-2 w-fit max-w-full rounded-full bg-(--color-ink-900) px-3 py-1 text-center text-[11px] font-medium text-(--color-ink-0) shadow-md transition-opacity duration-(--motion-base) ${
              showHint ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            แตะตึกบนแผนที่ หรือพิมพ์ชื่อย่อ
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-(--z-chrome) px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto max-w-screen-sm sm:w-fit sm:max-w-3xl">
          <FilterChips
            active={activeCategories}
            onToggle={toggleCategory}
            showZones={showZones}
            onToggleZones={() => {
              setShowZones((v) => !v);
              dismissHint();
            }}
            allOff={allOff}
          />
        </div>
      </div>

      <SuggestFab />

      <PlaceSheet place={selectedPlace} onClose={() => setSelectedPlace(null)} />
    </main>
  );
}
