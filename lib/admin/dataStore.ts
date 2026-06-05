import { promises as fs } from "fs";
import path from "path";
import type { Place, Zone } from "@/lib/types";

const PLACES_PATH = path.join(process.cwd(), "data", "places.json");
const ZONES_PATH = path.join(process.cwd(), "data", "zones.json");

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.tmp`;
  const body = JSON.stringify(data, null, 2) + "\n";
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, file);
}

export function readPlaces(): Promise<Place[]> {
  return enqueue(() => readJson<Place[]>(PLACES_PATH));
}

export function writePlaces(places: Place[]): Promise<void> {
  return enqueue(() => writeJsonAtomic(PLACES_PATH, places));
}

export function readZones(): Promise<Zone[]> {
  return enqueue(() => readJson<Zone[]>(ZONES_PATH));
}

export function writeZones(zones: Zone[]): Promise<void> {
  return enqueue(() => writeJsonAtomic(ZONES_PATH, zones));
}
