"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { CATEGORY_MAP, type CategoryId, type Place, type Zone } from "@/lib/types";
import { glyphSvg } from "@/lib/icons";

const KKU_CENTER: [number, number] = [16.4756, 102.8235];

const BRAND = "oklch(0.44 0.17 25)";
const BRAND_RING = BRAND;
const SHADOW = "0 2px 6px oklch(0.2 0.04 25 / 0.30)";

/** Zoom threshold below which markers cluster. */
const CLUSTER_BELOW = 15;
/** Zoom threshold at and above which markers render as full chips. */
const CHIP_AT = 17;

function chipIcon(place: Place, selected: boolean) {
  const cat = CATEGORY_MAP[place.category];
  const size = selected ? 40 : 34;
  const inner = glyphSvg(place.category, {
    size: selected ? 20 : 18,
    color: "white",
  });
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
          ${SHADOW},
          0 0 0 2px white,
          ${selected ? `0 0 0 4px ${BRAND_RING}` : "0 0 0 0 transparent"};
        transform:translateY(${selected ? "-2px" : "0"}) scale(${selected ? 1.04 : 1});
        transition:transform 200ms cubic-bezier(0.25,1,0.5,1), box-shadow 200ms cubic-bezier(0.25,1,0.5,1);
      ">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function dotIcon(place: Place, selected: boolean) {
  const cat = CATEGORY_MAP[place.category];
  const size = selected ? 18 : 14;
  return L.divIcon({
    className: "kku-marker",
    html: `
      <div style="
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:${cat.color};
        box-shadow:
          0 0 0 2px white,
          ${SHADOW}${selected ? `, 0 0 0 4px ${BRAND_RING}` : ""};
        transition:box-shadow 180ms cubic-bezier(0.25,1,0.5,1);
      "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function iconFor(place: Place, selected: boolean, zoom: number) {
  return zoom >= CHIP_AT ? chipIcon(place, selected) : dotIcon(place, selected);
}

function clusterIcon(count: number) {
  const size = count < 10 ? 32 : count < 30 ? 38 : 44;
  const fontSize = size < 38 ? 13 : size < 44 ? 14 : 15;
  return L.divIcon({
    className: "kku-cluster",
    html: `
      <div style="
        width:${size}px;height:${size}px;
        display:grid;place-items:center;
        border-radius:50%;
        background:${BRAND};color:white;
        font-weight:700;font-size:${fontSize}px;font-feature-settings:'tnum';
        box-shadow:
          0 0 0 3px white,
          0 4px 12px oklch(0.2 0.04 25 / 0.32);
      ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export interface FlyTarget {
  placeId: string;
  zoom?: number;
  nonce: number;
}

interface Props {
  places: Place[];
  zones: Zone[];
  flyTarget: FlyTarget | null;
  selectedId: string | null;
  activeCategories: Set<CategoryId>;
  showZones: boolean;
  onSelectPlace: (place: Place) => void;
  sheetOffsetRatio?: number;
}

function FlyToSelected({
  places,
  flyTarget,
  sheetOffsetRatio = 0.22,
}: {
  places: Place[];
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
  }, [places, flyTarget, map, sheetOffsetRatio]);
  return null;
}

/**
 * Imperative cluster + per-marker layer. Sits inside MapContainer so it can
 * grab the map instance via useMap. The 3-tier marker render (cluster / dot /
 * chip) is the whole point of this component.
 */
function MarkersLayer({
  places,
  selectedId,
  activeCategories,
  onSelectPlace,
}: {
  places: Place[];
  selectedId: string | null;
  activeCategories: Set<CategoryId>;
  onSelectPlace: (place: Place) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const tierRef = useRef<"chip" | "dot">("dot");

  // Build / rebuild the cluster group whenever the filtered set changes.
  useEffect(() => {
    const visible = places.filter((p) => activeCategories.has(p.category));
    const group = L.markerClusterGroup({
      disableClusteringAtZoom: CLUSTER_BELOW,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 60,
      animateAddingMarkers: false,
      iconCreateFunction: (cluster) => clusterIcon(cluster.getChildCount()),
    });

    const zoom = map.getZoom();
    const markerById: Record<string, L.Marker> = {};
    for (const p of visible) {
      const m = L.marker([p.lat, p.lng], {
        icon: iconFor(p, p.id === selectedId, zoom),
        title: p.name,
        alt: p.name,
      });
      m.on("click", () => onSelectPlace(p));
      markerById[p.id] = m;
    }
    group.addLayers(Object.values(markerById));
    map.addLayer(group);
    groupRef.current = group;
    markersRef.current = markerById;
    tierRef.current = zoom >= CHIP_AT ? "chip" : "dot";

    return () => {
      map.removeLayer(group);
      groupRef.current = null;
      markersRef.current = {};
    };
  }, [places, activeCategories, onSelectPlace, map, selectedId]);

  // Swap icons when zoom crosses the chip threshold.
  useEffect(() => {
    const refresh = () => {
      const z = map.getZoom();
      const tier: "chip" | "dot" = z >= CHIP_AT ? "chip" : "dot";
      if (tier === tierRef.current) return;
      tierRef.current = tier;
      const visible = places.filter((p) => activeCategories.has(p.category));
      for (const p of visible) {
        const m = markersRef.current[p.id];
        if (m) m.setIcon(iconFor(p, p.id === selectedId, z));
      }
    };
    map.on("zoomend", refresh);
    return () => {
      map.off("zoomend", refresh);
    };
  }, [places, activeCategories, selectedId, map]);

  // When `selectedId` changes within the same tier, refresh just the affected
  // markers so the selection ring tracks state without a tier swap.
  useEffect(() => {
    const z = map.getZoom();
    for (const [id, marker] of Object.entries(markersRef.current)) {
      const p = places.find((pp) => pp.id === id);
      if (p) marker.setIcon(iconFor(p, id === selectedId, z));
    }
  }, [places, selectedId, map]);

  return null;
}

export default function Map({
  places,
  zones,
  flyTarget,
  selectedId,
  activeCategories,
  showZones,
  onSelectPlace,
  sheetOffsetRatio,
}: Props) {
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

      <MarkersLayer
        places={places}
        selectedId={selectedId}
        activeCategories={activeCategories}
        onSelectPlace={onSelectPlace}
      />

      <FlyToSelected
        places={places}
        flyTarget={flyTarget}
        sheetOffsetRatio={sheetOffsetRatio}
      />
    </MapContainer>
  );
}
