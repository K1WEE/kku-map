# Admin: Add Location (Place & Zone) — Design Spec

**Date:** 2026-06-05
**Scope:** เพิ่มหน้า `/admin` ให้ผู้ดูแลโปรเจกต์เพิ่ม/แก้/ลบ place และ zone ผ่าน UI โดยไม่ต้องแก้ JSON มือ
**Audience:** เจ้าของโปรเจกต์คนเดียว (dev mode only)

---

## 1. Goals & Non-Goals

**Goals**
- เปลี่ยน workflow จาก "แก้ `data/*.json` มือ" → "คลิกบนแผนที่ + กรอกฟอร์ม"
- รองรับการปักหมุด place ใหม่และวาด polygon zone ใหม่
- รองรับการแก้/ลบของเดิม
- ข้อมูลเขียนกลับลง `data/places.json` / `data/zones.json` ตรงๆ เพื่อให้ commit ลง git ได้ทันที

**Non-Goals (YAGNI)**
- Authentication / multi-user
- Production deployment ของหน้า admin
- รองรับการอัปโหลดรูป (ใช้แค่ path string)
- Audit log / undo history / soft delete
- Geocoding / search-to-coord
- รองรับ multi-polygon, hole, ring

---

## 2. Architecture

```
app/
  admin/
    page.tsx              ← /admin shell (client) — 404 ถ้าไม่ใช่ dev
  api/admin/
    places/route.ts       ← GET / POST / PUT / DELETE
    zones/route.ts        ← GET / POST / PUT / DELETE
components/admin/
  AdminMap.tsx            ← wrap Map.tsx + edit overlay
  PlaceForm.tsx
  ZoneForm.tsx
  CoordPicker.tsx         ← input lat/lng + GPS + paste-parser
  ZoneDrawer.tsx          ← polygon drawing logic
lib/admin/
  dataStore.ts            ← read/write JSON (atomic + mutex)
  schemas.ts              ← Zod schemas
```

**Guards 2 ชั้น:**
1. `app/admin/page.tsx`: `if (process.env.NODE_ENV !== 'development') notFound()`
2. ทุก API route handler: return 403 ถ้าไม่ใช่ dev

**Data flow:**
- หน้า `/` ยัง static `import` จาก `data/*.json` ตามเดิม → zero impact
- หน้า `/admin` fetch ผ่าน API (`GET /api/admin/places`) → เห็นข้อมูลสดทันทีหลัง save (Turbopack ไม่ pick up JSON write)

---

## 3. UX Flow

**Layout** (mobile-first):
- แผนที่เต็มจอ
- Top bar: tabs `[จุด]` `[โซน]` + ปุ่ม `+ เพิ่มใหม่`
- Bottom sheet (mobile) / side panel ขวา (≥md): list ของ place/zone ที่มีอยู่ — กดเพื่อ edit
- Floating toolbar: โผล่ตาม edit mode

**State machine** (`editMode`):

| Mode | คลิกแผนที่ทำอะไร | UI |
|---|---|---|
| `idle` | — | list + ปุ่ม + |
| `add-place` | วาง marker draft (ลากย้ายได้) | ฟอร์ม + crosshair |
| `edit-place` | ขยับ marker | ฟอร์ม pre-filled |
| `draw-zone` | เพิ่ม vertex (เห็น live polyline) | ฟอร์ม + toolbar `[↶ Undo] [✓ Finish] [✕ Cancel]` |
| `edit-zone` | ขยับ/ลบ vertex | ฟอร์ม + vertex draggable |

**Save flow:** กด `บันทึก` → POST/PUT → toast → refetch → กลับ `idle`

**Cancel:** ESC หรือปุ่ม cancel → ถ้ามี unsaved change ถาม confirm → ทิ้ง draft → `idle`

---

## 4. Form Fields & Validation

### PlaceForm
| Field | Type | Validation |
|---|---|---|
| `id` | string | `^[A-Z0-9_-]+$`, unique (auto-suggest จาก name) |
| `name` | string (Thai) | required |
| `nameEn` | string | optional |
| `faculty` | string | optional (datalist จาก faculty ที่มีอยู่ใน places.json) |
| `category` | enum CategoryId | required (dropdown จาก `CATEGORIES`) |
| `lat`, `lng` | number | ผ่าน `CoordPicker`. Warn (ไม่ block) ถ้าหลุด bbox KKU ~16.46–16.49, 102.81–102.84 |
| `description` | string | optional, textarea |
| `aliases` | string[] | TagInput (Enter เพิ่ม chip) |
| `image` | string | optional URL/path |

### ZoneForm
| Field | Type | Validation |
|---|---|---|
| `id` | string | `^[a-z0-9-]+$`, unique (auto-suggest จาก nameEn) |
| `name` | string (Thai) | required |
| `nameEn` | string | optional |
| `color` | hex | required (color picker + preset palette) |
| `polygon` | `[number,number][]` | min 3 vertices |

### CoordPicker
3 ปุ่ม: `📍 คลิกแผนที่` / `🛰️ GPS` / `📋 Paste`

Paste-parser รับ:
- `16.4734, 102.8238`
- `16.4734,102.8238`
- Google Maps URL — extract `@lat,lng`

ช่อง lat/lng แก้ตรงได้

**Validation timing:**
- Field-level: onBlur (เช่น id ซ้ำ)
- Form-level: onSubmit (Zod)
- Server: re-validate ก่อนเขียน → กัน race / direct API hit

---

## 5. API & Data Layer

### `lib/admin/dataStore.ts`
```ts
readPlaces(): Promise<Place[]>
writePlaces(places: Place[]): Promise<void>
readZones(): Promise<Zone[]>
writeZones(zones: Zone[]): Promise<void>
```

- Path: `path.join(process.cwd(), 'data', '{places,zones}.json')`
- Atomic write: `*.json.tmp` → `rename` (กันไฟล์พังถ้า process ตายกลางทาง)
- Format: `JSON.stringify(data, null, 2) + '\n'` → diff สวยใน git
- In-memory promise queue mutex → กัน concurrent write จาก double-submit

### `app/api/admin/{places,zones}/route.ts`
```
GET                  → read
POST   body: T        → validate + check id unique + append + write
PUT    body: T        → validate + find by id + replace + write
DELETE ?id=xxx        → find + remove + write
```

ทุก handler:
```ts
if (process.env.NODE_ENV !== 'development') {
  return new Response('Not available', { status: 403 });
}
```

**Error codes:**
- 400 + Zod issues → form แสดง field errors
- 409 → id ซ้ำ
- 500 → fs error (log server console + toast)

---

## 6. Map Integration

**Reuse `components/Map.tsx`** ผ่าน prop ใหม่ (default = view mode → หน้า `/` ไม่กระทบ):
```ts
interactionMode?: 'view' | 'add-place' | 'draw-zone' | 'edit-zone'
draftMarker?: { lat: number; lng: number } | null
draftPolygon?: [number, number][]
onMapClick?: (latlng: L.LatLng) => void
onMarkerDrag?: (latlng: L.LatLng) => void
onVertexDrag?: (index: number, latlng: L.LatLng) => void
```

**Polygon drawing** — เขียนเอง ไม่ใช้ leaflet-geoman:
- `useMapEvents` จับ `click` → push vertex เข้า `draftPolygon`
- render `<Polyline>` ปลายเปิด + `<CircleMarker draggable>` ทุก vertex
- กด Finish → ปิด polygon (push vertex แรกซ้ำ) → ส่งกลับให้ form

---

## 7. Gotchas

1. **Strict Mode ปิดอยู่** (`next.config.ts`) — admin map ใช้ pattern เดียวกัน (`next/dynamic({ ssr: false })`)
2. **JSON import เป็น static** — หน้า `/` ยัง static import ได้ แต่ `/admin` ต้อง fetch ผ่าน API
3. **Sheet offset (`sheetOffsetRatio`)** — admin ใช้ side panel เลยอาจไม่ต้อง offset แนวนอนแทน
4. **GPS button** ต้อง HTTPS หรือ localhost → dev บน localhost พอ
5. **Polygon ของ KKU มี vertex จำนวนมาก** — debounce การ re-render ที่ ~16ms ถ้าเจอ lag
6. **`L.divIcon` HTML markers** — admin draft marker ก็ต้อง divIcon ไม่ใช่ default icon (ตาม CLAUDE.md gotcha)

---

## 8. Testing

ไม่มี test suite อยู่แล้ว → manual smoke test ผ่าน dev server เพียงพอ

**Smoke test checklist:**
- [ ] เข้า `/admin` ใน dev mode → เห็นหน้า; ใน prod build → 404
- [ ] เพิ่ม place ใหม่ผ่านคลิกแผนที่ → save → เห็นใน `places.json` + เห็นบนหน้า `/`
- [ ] เพิ่ม place ผ่าน paste Google Maps URL → parse lat/lng ได้
- [ ] เพิ่ม place ผ่าน GPS button → ได้พิกัด
- [ ] วาด zone ใหม่ ≥3 vertex → save → เห็นใน `zones.json`
- [ ] แก้ zone เดิม (ลาก vertex) → save → diff ใน git อ่านง่าย
- [ ] ลบ place / zone → หาย
- [ ] id ซ้ำ → blocked
- [ ] POST `/api/admin/*` จาก curl ใน prod build → 403

---

## 9. Out of Scope (พิจารณาภายหลัง)

- Image upload (รับเฉพาะ path string)
- Multi-polygon / hole zone
- Bulk import จาก CSV / KML
- Search-to-coord (Nominatim geocoding)
- Diff view / preview ก่อน save
- Snap-to-existing-vertex ตอนวาด polygon ใกล้ๆ ของเดิม
