/**
 * Extract lat/lng from a pasted Google Maps URL or coord string.
 *
 * Accepts (in order):
 *   - "lat, lng" or "lat,lng" plain text
 *   - "@lat,lng" anywhere in a URL (long Google Maps URLs)
 *   - "?q=lat,lng" or "&q=lat,lng" (place links)
 *   - "?ll=lat,lng" (old-style)
 *
 * Returns null for short links (maps.app.goo.gl) — those need a server-side
 * resolve step (see `/api/resolve-maps-link`) because the coords aren't in
 * the short URL itself.
 */
export function parseMapsUrl(input: string): { lat: number; lng: number } | null {
  const s = input.trim();
  if (!s) return null;

  // Plain "lat, lng"
  const pairMatch = s.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lng = parseFloat(pairMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // @lat,lng anywhere (most common in copied Google Maps URLs)
  const atMatch = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // ?q= or &q=
  const qMatch = s.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // ?ll=
  const llMatch = s.match(/[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

/**
 * Recognise short Google Maps links that need a server-side fetch to resolve.
 * Returns true for the link domains; the caller posts to /api/resolve-maps-link.
 */
export function isShortMapsUrl(input: string): boolean {
  const s = input.trim();
  return (
    /^https?:\/\/maps\.app\.goo\.gl\//.test(s) ||
    /^https?:\/\/goo\.gl\/maps\//.test(s)
  );
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
