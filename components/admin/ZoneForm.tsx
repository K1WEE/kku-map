"use client";

import { useState, useEffect } from "react";
import type { Zone } from "@/lib/types";

interface Props {
  initial?: Zone | null;
  existingIds: string[];
  polygon: [number, number][];
  drawingActive: boolean;
  onUndoVertex: () => void;
  onClearPolygon: () => void;
  onStartDrawing: () => void;
  onSubmit: (zone: Zone) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export default function ZoneForm({
  initial,
  existingIds,
  polygon,
  drawingActive,
  onUndoVertex,
  onClearPolygon,
  onStartDrawing,
  onSubmit,
  onCancel,
  onDelete,
}: Props) {
  const editing = !!initial;
  const [id, setId] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [color, setColor] = useState(initial?.color ?? "#3b82f6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    if (!id && nameEn) {
      const suggest = nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 24);
      if (suggest) setId(suggest);
    }
  }, [nameEn, id, initial]);

  const idTaken = !editing && existingIds.includes(id.trim()) && id.trim() !== "";
  const idFormatBad = id.trim() !== "" && !/^[a-z0-9-]+$/.test(id.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!id.trim() || !name.trim()) {
      setError("กรอก id และชื่อให้ครบ");
      return;
    }
    if (idFormatBad) {
      setError("id ใช้ได้เฉพาะ a-z, 0-9 และ -");
      return;
    }
    if (polygon.length < 3) {
      setError("ต้องวาด polygon อย่างน้อย 3 จุด");
      return;
    }
    if (idTaken) {
      setError("id ซ้ำ");
      return;
    }
    setSaving(true);
    try {
      const zone: Zone = {
        id: id.trim(),
        name: name.trim(),
        ...(nameEn.trim() && { nameEn: nameEn.trim() }),
        color,
        polygon,
      };
      await onSubmit(zone);
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกล้มเหลว");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-3 text-sm">
      <h2 className="text-base font-semibold">
        {editing ? "แก้ไขโซน" : "เพิ่มโซนใหม่"}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">id</span>
        <input
          value={id}
          disabled={editing}
          onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          className="rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
          placeholder="engineering"
        />
        {idTaken && <span className="text-xs text-red-600">id ซ้ำ</span>}
        {idFormatBad && (
          <span className="text-xs text-red-600">id ใช้ได้เฉพาะ a-z, 0-9, -</span>
        )}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">ชื่อ (ไทย)</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">ชื่อ (อังกฤษ)</span>
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">สี</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-12 cursor-pointer rounded border border-gray-300"
          />
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs"
          />
        </div>
        <div className="flex gap-1 pt-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ background: c }}
              className="h-6 w-6 rounded border border-gray-300"
              aria-label={c}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">Polygon</span>
        <div className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5">
          <span className="text-xs">{polygon.length} จุด</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onStartDrawing}
              className={`rounded border px-2 py-0.5 text-xs ${
                drawingActive
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 hover:bg-gray-100"
              }`}
            >
              {drawingActive ? "กำลังวาด…" : polygon.length > 0 ? "วาดต่อ" : "เริ่มวาด"}
            </button>
            <button
              type="button"
              onClick={onUndoVertex}
              disabled={polygon.length === 0}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100 disabled:opacity-40"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={onClearPolygon}
              disabled={polygon.length === 0}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-100 disabled:opacity-40"
            >
              ล้าง
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          ยกเลิก
        </button>
        {editing && onDelete && (
          <button
            type="button"
            onClick={async () => {
              if (confirm(`ลบ "${initial?.name}"?`)) await onDelete();
            }}
            className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            ลบ
          </button>
        )}
      </div>
    </form>
  );
}
