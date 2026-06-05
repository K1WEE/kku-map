"use client";

import { useState, useEffect } from "react";
import { CATEGORIES, type Place, type CategoryId } from "@/lib/types";
import CoordPicker from "./CoordPicker";

interface Props {
  initial?: Place | null;
  existingIds: string[];
  existingFaculties: string[];
  lat: number | null;
  lng: number | null;
  pickingFromMap: boolean;
  onCoordChange: (lat: number | null, lng: number | null) => void;
  onRequestPickFromMap: () => void;
  onSubmit: (place: Place) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

export default function PlaceForm({
  initial,
  existingIds,
  existingFaculties,
  lat,
  lng,
  pickingFromMap,
  onCoordChange,
  onRequestPickFromMap,
  onSubmit,
  onCancel,
  onDelete,
}: Props) {
  const editing = !!initial;
  const [id, setId] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [faculty, setFaculty] = useState(initial?.faculty ?? "");
  const [category, setCategory] = useState<CategoryId>(
    initial?.category ?? "building",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [aliases, setAliases] = useState<string[]>(initial?.aliases ?? []);
  const [aliasDraft, setAliasDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    if (!id && name) {
      const suggest = name
        .replace(/\(([^)]+)\)\s*$/, "$1")
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, "")
        .slice(0, 12);
      if (suggest) setId(suggest);
    }
  }, [name, id, initial]);

  const idTaken =
    !editing && existingIds.includes(id.trim()) && id.trim() !== "";

  function addAlias() {
    const a = aliasDraft.trim();
    if (a && !aliases.includes(a)) setAliases([...aliases, a]);
    setAliasDraft("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!id.trim() || !name.trim()) {
      setError("กรอก id และชื่อให้ครบ");
      return;
    }
    if (lat === null || lng === null) {
      setError("เลือกพิกัดก่อน");
      return;
    }
    if (idTaken) {
      setError("id ซ้ำ");
      return;
    }
    setSaving(true);
    try {
      const place: Place = {
        id: id.trim(),
        name: name.trim(),
        ...(nameEn.trim() && { nameEn: nameEn.trim() }),
        ...(faculty.trim() && { faculty: faculty.trim() }),
        category,
        lat,
        lng,
        ...(description.trim() && { description: description.trim() }),
        ...(image.trim() && { image: image.trim() }),
        ...(aliases.length > 0 && { aliases }),
      };
      await onSubmit(place);
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกล้มเหลว");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-3 text-sm">
      <h2 className="text-base font-semibold">
        {editing ? "แก้ไขจุด" : "เพิ่มจุดใหม่"}
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">id</span>
        <input
          value={id}
          disabled={editing}
          onChange={(e) => setId(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100"
          placeholder="EN05"
        />
        {idTaken && <span className="text-xs text-red-600">id ซ้ำ</span>}
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

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">คณะ</span>
        <input
          list="faculty-list"
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        />
        <datalist id="faculty-list">
          {existingFaculties.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">หมวด</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryId)}
          className="rounded border border-gray-300 px-2 py-1"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">พิกัด</span>
        <CoordPicker
          lat={lat}
          lng={lng}
          onChange={onCoordChange}
          onRequestPickFromMap={onRequestPickFromMap}
          pickingFromMap={pickingFromMap}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">คำอธิบาย</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="rounded border border-gray-300 px-2 py-1"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">ชื่อเรียกอื่น (aliases)</span>
        <div className="flex gap-1">
          <input
            value={aliasDraft}
            onChange={(e) => setAliasDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAlias();
              }
            }}
            placeholder="กด Enter เพื่อเพิ่ม"
            className="flex-1 rounded border border-gray-300 px-2 py-1"
          />
          <button
            type="button"
            onClick={addAlias}
            className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
          >
            +
          </button>
        </div>
        {aliases.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {aliases.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs"
              >
                {a}
                <button
                  type="button"
                  onClick={() => setAliases(aliases.filter((x) => x !== a))}
                  className="text-gray-500 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">รูป (path/URL)</span>
        <input
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        />
      </label>

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
