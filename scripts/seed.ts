/**
 * Seed Supabase from data/{places,zones}.json.
 *
 * Idempotent: uses upsert on primary key, so re-running is safe.
 * Required env (loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run seed
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import type { Place, Zone } from "../lib/types";
import { rowFromPlace, rowFromZone } from "../lib/supabase/types";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

// Untyped client — seed runs once with service role, type safety here gets
// in the way more than it helps. The typed clients live in lib/supabase/.
//
// Node 20 has no global WebSocket; Supabase v2 instantiates realtime on
// construction, so we polyfill via `ws`. Node 22+ has it natively and this
// import is harmless.
import WebSocket from "ws";
if (!(globalThis as { WebSocket?: unknown }).WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket =
    WebSocket as unknown as typeof globalThis.WebSocket;
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function readJson<T>(rel: string): T {
  const file = path.join(process.cwd(), rel);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

async function main() {
  const places = readJson<Place[]>("data/places.json");
  const zones = readJson<Zone[]>("data/zones.json");

  console.log(`Seeding ${places.length} places...`);
  const { error: placeErr } = await supabase
    .from("places")
    .upsert(places.map(rowFromPlace), { onConflict: "id" });
  if (placeErr) {
    console.error("places upsert failed:", placeErr);
    process.exit(1);
  }

  console.log(`Seeding ${zones.length} zones...`);
  const { error: zoneErr } = await supabase
    .from("zones")
    .upsert(zones.map(rowFromZone), { onConflict: "id" });
  if (zoneErr) {
    console.error("zones upsert failed:", zoneErr);
    process.exit(1);
  }

  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
