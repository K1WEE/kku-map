# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

KKU Maps — a mobile-first web map of Khon Kaen University for incoming freshmen. No authentication, no backend; data is shipped as JSON files. Built with Next.js (App Router) + Leaflet/OSM. UI text is primarily Thai.

## Commands

```bash
npm run dev      # Turbopack dev server (defaults to :3000; this repo currently uses PORT=3100)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

There is no test suite.

## Architecture

**Single-page client app.** `app/page.tsx` is a client component that owns all top-level state and composes four pieces:

- `components/Map.tsx` — Leaflet map. **Must** be loaded via `next/dynamic({ ssr: false })` because Leaflet touches `window` on import. It receives a `flyTarget` object (with a `nonce` so re-selecting the same place still re-fires the effect) and category/zone visibility flags. Marker clicks are surfaced through an `onSelectPlace` callback; there are no Leaflet `<Popup>`s.
- `components/SearchBar.tsx` — fuzzy search using `lib/search.ts` (Fuse.js over `data/places.json`). Selecting a result calls `openPlace(place, { zoom: 18 })`.
- `components/FilterChips.tsx` — toggles `activeCategories` (a `Set<CategoryId>`) and `showZones`.
- `components/PlaceSheet.tsx` — bottom sheet with the selected place's details and Google Maps "directions" / "open in Maps" deep links. Replaces the default Leaflet popup.

**Data flow.** Two JSON files drive the entire map:

- `data/places.json` — typed as `Place[]` (see `lib/types.ts`). `id`, `name`, `aliases`, `category`, `lat`, `lng` are the meaningful fields for rendering and search. `aliases` are weighted heavily in Fuse so abbreviations like `EN04` / `EN 04` / `ตึกวิศวะ 4` all resolve to the same place.
- `data/zones.json` — typed as `Zone[]`. Each zone is a faculty-level polygon rendered as a translucent `<Polygon>` with a `<Tooltip>`.

`CATEGORIES` in `lib/types.ts` is the single source of truth for category IDs, labels, icons, and colors — `places.json`, marker icons (built via `L.divIcon` with inline HTML), the sheet header chip, and the filter chips all read from it.

**Sheet/marker centering.** When a place is selected the map flies to it with a pixel offset (`sheetOffsetRatio` in `Map.tsx`) so the marker lands in the visible strip between the top search UI and the bottom sheet, instead of being hidden behind the sheet. The ratio is set in `app/page.tsx` and currently tuned to ~0.17 of viewport height. Adjust there if the top/bottom UI changes height.

## Gotchas

- **React Strict Mode is disabled** in `next.config.ts`. This is deliberate: react-leaflet's `MapContainer` binds Leaflet imperatively to a DOM node and crashes on Strict Mode's double-mount cycle (`Map container is being reused by another instance`). Do not re-enable it without a different mounting strategy.
- **Leaflet's default marker icon assets** are not bundled by Next.js. `Map.tsx` works around this by using `L.divIcon` with inline HTML for every marker; do not switch to the default `L.Icon` without also handing it explicit `iconUrl`/`shadowUrl` paths.
- **`reactStrictMode: false` + `next dev` Turbopack** is the verified working combo on this repo. If you change either, re-test that the map mounts cleanly on HMR.
- The package name in `package.json` is `kku-maps`; the directory name is `Kku-maps` with capital letters. `create-next-app` rejects the dir name — if you re-bootstrap, init into a subfolder first.

## Conventions

- Path alias `@/*` resolves to the repo root (see `tsconfig.json`). Import data and lib as `@/data/...` / `@/lib/...`.
- Place coordinates in JSON are currently placeholder values; the project owner replaces them with surveyed positions.
- UI copy is Thai; identifiers and code comments are English.
