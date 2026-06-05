"use client";

import { useState } from "react";

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  onRequestPickFromMap: () => void;
  pickingFromMap?: boolean;
}

const KKU_BBOX = { latMin: 16.46, latMax: 16.49, lngMin: 102.81, lngMax: 102.84 };

function parsePaste(input: string): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  // Google Maps URL with @lat,lng
  const urlMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (urlMatch) {
    const lat = parseFloat(urlMatch[1]);
    const lng = parseFloat(urlMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  // "lat, lng" or "lat,lng"
  const pairMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lng = parseFloat(pairMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

export default function CoordPicker({
  lat,
  lng,
  onChange,
  onRequestPickFromMap,
  pickingFromMap,
}: Props) {
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  function handleGps() {
    if (!navigator.geolocation) {
      setGpsError("เบราว์เซอร์ไม่รองรับ GPS");
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setGpsBusy(false);
      },
      (err) => {
        setGpsError(err.message);
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parsePaste(text);
      if (parsed) {
        onChange(parsed.lat, parsed.lng);
      } else {
        alert(
          "วาง lat/lng ไม่ได้\nรองรับรูปแบบ:\n  16.4734, 102.8238\n  Google Maps URL",
        );
      }
    } catch {
      alert("เข้าถึงคลิปบอร์ดไม่ได้");
    }
  }

  const outOfBbox =
    lat !== null &&
    lng !== null &&
    (lat < KKU_BBOX.latMin ||
      lat > KKU_BBOX.latMax ||
      lng < KKU_BBOX.lngMin ||
      lng > KKU_BBOX.lngMax);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRequestPickFromMap}
          className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
            pickingFromMap
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 hover:bg-gray-50"
          }`}
        >
          📍 {pickingFromMap ? "คลิกบนแผนที่…" : "คลิกแผนที่"}
        </button>
        <button
          type="button"
          onClick={handleGps}
          disabled={gpsBusy}
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
        >
          🛰️ {gpsBusy ? "กำลังหา…" : "GPS"}
        </button>
        <button
          type="button"
          onClick={handlePaste}
          className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs hover:bg-gray-50"
        >
          📋 Paste
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          lat
          <input
            type="number"
            step="any"
            value={lat ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value), lng)
            }
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          lng
          <input
            type="number"
            step="any"
            value={lng ?? ""}
            onChange={(e) =>
              onChange(lat, e.target.value === "" ? null : Number(e.target.value))
            }
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>
      {gpsError && <p className="text-xs text-red-600">{gpsError}</p>}
      {outOfBbox && (
        <p className="text-xs text-amber-700">
          ⚠️ พิกัดอยู่นอก bounding box ของ KKU (เช็คอีกที?)
        </p>
      )}
    </div>
  );
}
