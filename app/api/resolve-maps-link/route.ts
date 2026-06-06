import { NextRequest, NextResponse } from "next/server";
import { parseMapsUrl } from "@/lib/parseMapsUrl";

/**
 * Resolve a Google Maps short link (maps.app.goo.gl / goo.gl/maps) into its
 * full URL and extract lat/lng. Used by the submission form so users can
 * paste the result of the mobile "Share" sheet, which is always a short
 * link.
 *
 * Only follows redirects on the two Google short-link hosts to keep this
 * from becoming an open URL fetcher. Returns 400 for everything else.
 */
const ALLOWED_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return NextResponse.json({ error: "ลิงก์ไม่ถูกต้อง" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(host)) {
    return NextResponse.json(
      { error: "รองรับเฉพาะลิงก์ Google Maps (goo.gl, maps.app.goo.gl)" },
      { status: 400 },
    );
  }

  // Follow up to a small number of redirects manually so we can extract the
  // final URL even when the server returns 301/302 chains. `fetch`'s default
  // `redirect: 'follow'` does this but doesn't always expose the final URL
  // through res.url in every runtime — manual is more predictable.
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        // A real UA so Google doesn't serve a no-coords landing page
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KKUMapsBot/1.0)" },
      });
    } catch {
      return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      // Resolve relative redirects against the previous URL
      current = new URL(location, current).toString();
      // If we've landed on a non-short URL, try to parse and bail early
      const coords = parseMapsUrl(current);
      if (coords) return NextResponse.json(coords);
      continue;
    }

    // Non-redirect: try to parse from the URL we arrived at, then bail.
    const coords = parseMapsUrl(current);
    if (coords) return NextResponse.json(coords);
    break;
  }

  return NextResponse.json(
    { error: "หาพิกัดในลิงก์ไม่เจอ — ลองเปิดลิงก์ใน browser แล้ว copy URL เต็มจาก address bar" },
    { status: 422 },
  );
}
