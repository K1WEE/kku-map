"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { Place, Zone } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/types";

const KKU_CENTER: [number, number] = [16.4756, 102.8235];

export type EditMode =
  | { kind: "idle" }
  | { kind: "add-place" }
  | { kind: "edit-place"; id: string }
  | { kind: "draw-zone" }
  | { kind: "edit-zone"; id: string };

interface Props {
  places: Place[];
  zones: Zone[];
  editMode: EditMode;
  draftMarker: { lat: number; lng: number } | null;
  draftPolygon: [number, number][];
  drawingActive: boolean;
  pickingFromMap: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onMarkerDrag: (lat: number, lng: number) => void;
  onVertexDrag: (index: number, lat: number, lng: number) => void;
  onSelectPlace: (id: string) => void;
  onSelectZone: (id: string) => void;
}

function dotMarker(color: string, selected: boolean) {
  const size = selected ? 18 : 14;
  return L.divIcon({
    className: "kku-marker",
    html: `<div style="
      width:${size}px;height:${size}px;
      border-radius:50%;
      background:${color};
      box-shadow:0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.3)${
        selected ? ", 0 0 0 4px oklch(0.44 0.17 25)" : ""
      };
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function draftMarkerIcon() {
  return L.divIcon({
    className: "kku-draft-marker",
    html: `<div style="
      width:24px;height:24px;
      border-radius:50%;
      background:#2563eb;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      animation:pulse 1.5s ease-in-out infinite;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function MapClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function CursorStyler({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (active) {
      el.style.cursor = "crosshair";
    } else {
      el.style.cursor = "";
    }
    return () => {
      el.style.cursor = "";
    };
  }, [map, active]);
  return null;
}

export default function AdminMap({
  places,
  zones,
  editMode,
  draftMarker,
  draftPolygon,
  drawingActive,
  pickingFromMap,
  onMapClick,
  onMarkerDrag,
  onVertexDrag,
  onSelectPlace,
  onSelectZone,
}: Props) {
  const clickEnabled =
    pickingFromMap ||
    drawingActive ||
    editMode.kind === "add-place" ||
    editMode.kind === "draw-zone";

  return (
    <MapContainer
      center={KKU_CENTER}
      zoom={15}
      minZoom={13}
      maxZoom={19}
      scrollWheelZoom
      zoomControl={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      <CursorStyler active={clickEnabled} />
      <MapClickHandler enabled={clickEnabled} onClick={onMapClick} />

      {zones.map((z) => {
        const isSelected =
          editMode.kind === "edit-zone" && editMode.id === z.id;
        return (
          <Polygon
            key={z.id}
            positions={z.polygon}
            pathOptions={{
              color: z.color,
              weight: isSelected ? 3 : 1.5,
              opacity: isSelected ? 1 : 0.6,
              fillColor: z.color,
              fillOpacity: isSelected ? 0.2 : 0.1,
            }}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                if (!clickEnabled) onSelectZone(z.id);
              },
            }}
          >
            <Tooltip sticky direction="top" opacity={0.95}>
              <div className="text-xs font-medium">{z.name}</div>
            </Tooltip>
          </Polygon>
        );
      })}

      {places.map((p) => {
        const cat = CATEGORY_MAP[p.category];
        const isSelected =
          editMode.kind === "edit-place" && editMode.id === p.id;
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={dotMarker(cat?.color ?? "#666", isSelected)}
            eventHandlers={{
              click: () => {
                if (!clickEnabled) onSelectPlace(p.id);
              },
            }}
          >
            <Tooltip direction="top" opacity={0.95}>
              <div className="text-xs">{p.name}</div>
            </Tooltip>
          </Marker>
        );
      })}

      {draftMarker && (
        <Marker
          position={[draftMarker.lat, draftMarker.lng]}
          icon={draftMarkerIcon()}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              onMarkerDrag(ll.lat, ll.lng);
            },
          }}
        />
      )}

      {draftPolygon.length >= 2 && (
        <Polyline
          positions={draftPolygon}
          pathOptions={{
            color: "#2563eb",
            weight: 2,
            dashArray: "4,4",
          }}
        />
      )}

      {draftPolygon.map((pt, i) => (
        <CircleMarker
          key={i}
          center={pt}
          radius={6}
          pathOptions={{
            color: "white",
            weight: 2,
            fillColor: "#2563eb",
            fillOpacity: 1,
          }}
          eventHandlers={{
            mousedown: (e) => {
              const map = e.target._map as L.Map;
              map.dragging.disable();
              const onMove = (ev: L.LeafletMouseEvent) => {
                onVertexDrag(i, ev.latlng.lat, ev.latlng.lng);
              };
              const onUp = () => {
                map.off("mousemove", onMove);
                map.off("mouseup", onUp);
                map.dragging.enable();
              };
              map.on("mousemove", onMove);
              map.on("mouseup", onUp);
            },
          }}
        />
      ))}
    </MapContainer>
  );
}
