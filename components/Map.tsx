"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import placesData from "@/data/places.json";
import zonesData from "@/data/zones.json";
import { CATEGORY_MAP, type CategoryId, type Place, type Zone } from "@/lib/types";
import { glyphSvg } from "@/lib/icons";

const places = placesData as Place[];
const zones = zonesData as Zone[];

const KKU_CENTER: [number, number] = [16.4756, 102.8235];

const BRAND_RING = "oklch(0.44 0.17 25)";

function categoryIcon(place: Place, selected: boolean) {
  const cat = CATEGORY_MAP[place.category];
  const size = selected ? 40 : 34;
  const inner = glyphSvg(place.category, { size: selected ? 20 : 18, color: "white" });
  return L.divIcon({
    className: "kku-marker",
    html: `
      <div style="
        position:relative;
        width:${size}px;height:${size}px;
        display:grid;place-items:center;
        border-radius:11px;
        background:${cat.color};
        box-shadow:
          0 1px 0 oklch(1 0 0 / 0.45) inset,
          0 2px 6px oklch(0.2 0.04 25 / 0.30),
          0 0 0 2px white,
          ${selected ? `0 0 0 4px ${BRAND_RING}` : "0 0 0 0 transparent"};
        transform:translateY(${selected ? "-2px" : "0"}) scale(${selected ? 1.04 : 1});
        transition:transform 200ms cubic-bezier(0.25,1,0.5,1), box-shadow 200ms cubic-bezier(0.25,1,0.5,1);
      ">
        ${inner}
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export interface FlyTarget {
  placeId: string;
  zoom?: number;
  nonce: number;
}

interface Props {
  flyTarget: FlyTarget | null;
  selectedId: string | null;
  markerRefs: React.RefObject<Record<string, L.Marker | null>>;
  activeCategories: Set<CategoryId>;
  showZones: boolean;
  onSelectPlace: (place: Place) => void;
  /** Fraction of viewport height to pull the marker upward (0..0.5). */
  sheetOffsetRatio?: number;
}

function FlyToSelected({
  flyTarget,
  sheetOffsetRatio = 0.22,
}: {
  flyTarget: FlyTarget | null;
  sheetOffsetRatio?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!flyTarget) return;
    const place = places.find((p) => p.id === flyTarget.placeId);
    if (!place) return;
    const targetZoom = flyTarget.zoom ?? map.getZoom();
    const point = map.project([place.lat, place.lng], targetZoom);
    const offsetY = map.getSize().y * sheetOffsetRatio;
    const target = map.unproject(point.add([0, offsetY]), targetZoom);
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      map.setView(target, targetZoom, { animate: false });
    } else {
      map.flyTo(target, targetZoom, { duration: 0.7 });
    }
  }, [flyTarget, map, sheetOffsetRatio]);
  return null;
}

export default function Map({
  flyTarget,
  selectedId,
  markerRefs,
  activeCategories,
  showZones,
  onSelectPlace,
  sheetOffsetRatio,
}: Props) {
  const localRefs = useRef<Record<string, L.Marker | null>>({});
  const refs = markerRefs ?? localRefs;

  return (
    <MapContainer
      center={KKU_CENTER}
      zoom={15}
      minZoom={13}
      maxZoom={19}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      {showZones &&
        zones.map((z) => (
          <Polygon
            key={z.id}
            positions={z.polygon}
            pathOptions={{
              color: z.color,
              weight: 1.5,
              opacity: 0.7,
              fillColor: z.color,
              fillOpacity: 0.12,
            }}
          >
            <Tooltip sticky direction="top" opacity={0.95}>
              <div className="text-xs font-medium">{z.name}</div>
              {z.nameEn && (
                <div className="text-[10px] italic opacity-70">{z.nameEn}</div>
              )}
            </Tooltip>
          </Polygon>
        ))}

      {places
        .filter((p) => activeCategories.has(p.category))
        .map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={categoryIcon(p, p.id === selectedId)}
            ref={(instance) => {
              refs.current[p.id] = instance;
            }}
            eventHandlers={{
              click: () => onSelectPlace(p),
            }}
          />
        ))}

      <FlyToSelected flyTarget={flyTarget} sheetOffsetRatio={sheetOffsetRatio} />
    </MapContainer>
  );
}
