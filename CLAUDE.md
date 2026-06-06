# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

KKU Maps — a mobile-first web map of Khon Kaen University for incoming freshmen. Built with Next.js (App Router) + Leaflet/OSM + Supabase (Postgres, Auth, Storage). UI text is primarily Thai.

The map is anonymous-browsable (no login wall). Authenticated users can submit new places or edit suggestions; submissions land in an admin moderation queue before becoming visible to everyone. `data/*.json` is now seed data only — runtime state lives in Postgres.

## Commands

```bash
npm run dev      # Turbopack dev server (defaults to :3000)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
npm run seed     # one-shot: pushes data/*.json into Supabase (uses service-role key)
```

There is no test suite. Smoke checks live in the design spec at `docs/superpowers/specs/2026-06-05-user-contributions-design.md`.

## Environment

Required env (`.env.local`, see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only, never expose to the client
```

Supabase setup steps live in the spec doc. Short version: apply `supabase/migrations/{0001_init,0002_storage}.sql` via the SQL editor, enable the Google OAuth provider, add `http://localhost:3000` (and the prod domain) to Auth → URL Configuration, then run `npm run seed`.

## Architecture

### Top-level surfaces

| Path | Purpose | Auth |
|---|---|---|
| `/` | Map + search + place sheet (read-only) | anonymous OK |
| `/login` | Fallback Google sign-in landing for `?next=` redirects | anonymous |
| `/contribute/new` | "เสนอสถานที่ใหม่" form | signed-in |
| `/contribute/edit/[placeId]` | "เสนอแก้ไข" — pre-filled with diff hints | signed-in |
| `/contribute/mine` | Submitter's own queue + status | signed-in |
| `/admin` | Review queue + place/zone editors | `profiles.is_admin` |
| `/api/auth/callback` | Supabase OAuth code exchange (writes session cookies onto the redirect response directly) | n/a |
| `/api/submissions` | User POST + GET own | signed-in |
| `/api/admin/*` | Admin CRUD + approve/reject + queue list | `is_admin` |
| `/api/resolve-maps-link` | Resolves `maps.app.goo.gl` short links → `{lat,lng}` | n/a, host-allowlisted |

### Home page render path

`app/page.tsx` is a **server component** — it creates a Supabase server client, fetches `places` and `zones` (public RLS read), and hands them as props to `components/HomeClient.tsx` (`"use client"`). The map (`components/Map.tsx`) is dynamic-imported with `ssr: false` because Leaflet touches `window` on import.

`useRealtimeRefresh` (`hooks/useRealtimeRefresh.ts`) subscribes to the `places` and `zones` tables; any change calls `router.refresh()` which re-runs the server fetch without a hard reload, so React state (selected place, filters) survives.

Search still uses Fuse.js (`lib/search.ts`) — `buildFuse(places)` constructs an index inside `SearchBar` keyed on the live places prop.

### Submission flow

`SubmissionPageClient` (used by both `/contribute/new` and `/contribute/edit/[placeId]`) holds the lifted lat/lng so the map preview tracks the form's Google Maps URL field. The form is intentionally tiny (name / description / Maps link / image) — admin fills the missing structured fields (`nameEn`, `faculty`, `category`, `aliases`) at approve time. Submissions store the proposed payload as `jsonb` with a default `category = "landmark"`.

Photo upload goes straight to Supabase Storage (`submission-images` bucket) via the browser client; storage RLS gates the write to `<auth.uid>/<filename>`. URL parser (`lib/parseMapsUrl.ts`) handles long URLs and `lat,lng` text client-side; short links bounce through `/api/resolve-maps-link` server-side.

### Admin

`/admin` page is a server component that redirects unauthenticated users to `/login?next=/admin` and `notFound()`s for non-admins (404 over 403 by design — the admin URL shouldn't reveal its existence to non-admins). `AdminClient` then runs the queue UI.

Approve writes places first, submission second (a partial-failure mid-flow leaves an extra place + still-pending submission, which is recoverable; the inverse is worse). For `add` submissions the place id is `usub-<random>` unless the admin overrides; for `edit` the id is locked to `target_place_id`. `requireAdmin` (in `lib/admin/requireAdmin.ts`) is the shared API guard.

### Data layer

- `lib/supabase/client.ts` — browser client (cookies + realtime). Use in client components.
- `lib/supabase/server.ts` — server client (cookies via `next/headers`) + service-role client. Use in server components, route handlers, server actions.
- `lib/supabase/middleware.ts` — session refresh, called by top-level `middleware.ts`.
- `lib/supabase/types.ts` — hand-written DB row types + `placeFromRow`/`rowFromPlace` mappers.

**Important**: the Supabase JS Database generic widens insert/update args to `never` in this version. Both `createClient` and `createServiceClient` are intentionally untyped; Zod schemas (`lib/admin/schemas.ts`) handle boundary safety, and reads are narrowed via `.returns<...>()`.

## Gotchas

- **React Strict Mode is disabled** in `next.config.ts`. Deliberate: react-leaflet's `MapContainer` binds Leaflet imperatively to a DOM node and crashes on Strict Mode's double-mount cycle (`Map container is being reused by another instance`). Don't re-enable it without a different mounting strategy.
- **Leaflet's default marker icon assets** are not bundled by Next.js. `Map.tsx` works around this by using `L.divIcon` with inline HTML for every marker; don't switch to the default `L.Icon` without explicit `iconUrl`/`shadowUrl` paths.
- **OAuth callback writes cookies directly to the redirect response** (`app/api/auth/callback/route.ts`), not through `next/headers cookies()`. Cookies set via `cookies()` after an async call sometimes drop on redirect in Next 16 + `@supabase/ssr`. Bind to the `NextResponse` and the session survives.
- **`useUser` decouples auth state from the profile fetch** (`hooks/useUser.ts`). Gating the user flip on the profile query left the UI in a signed-out state when the RLS-bound `profiles` select stalled right after sign-in. User flips immediately; profile (admin flag, display name) loads in the background.
- **Supabase Realtime must be enabled per-table** in the dashboard (Database → Replication). Migration 0001 adds the publication entry but the toggles still need flipping on a fresh project.
- **Free tier has 200 concurrent realtime connections**. Each open tab on the map holds one — fine for small audiences, tight for an orientation-day surge. If we hit the cap the subscriptions silently degrade and the UI relies on user-initiated refresh.
- **The submission rate limit** (10 pending per user) is enforced by a Postgres trigger — the API just translates the `submission_limit_exceeded` exception into a 429.
- **Node 20 lacks global `WebSocket`**. The seed script (`scripts/seed.ts`) polyfills it from `ws` so `createClient` doesn't blow up at startup. Drop the polyfill on Node 22+.
- The package name in `package.json` is `kku-maps`; the directory name is `Kku-maps` with capital letters. `create-next-app` rejects the dir name — if you re-bootstrap, init into a subfolder first.

## Conventions

- Path alias `@/*` resolves to the repo root (see `tsconfig.json`). Import as `@/components/...`, `@/lib/...`, `@/hooks/...`.
- `CATEGORIES` in `lib/types.ts` is the single source of truth for category IDs, labels, icons, and colors — markers, sheet chips, filter chips, the admin form, and the submission diff all read from it.
- UI copy is Thai; identifiers and code comments are English.
- Brand color tokens live in `app/globals.css` under `@theme inline` — Restrained product register, OKLCH ramps tilted toward the maroon hue. Add semantic tokens before reaching for raw OKLCH.
