import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` (and the
 * exported `middleware` function to `proxy`). The behaviour is identical;
 * this file is the same one-liner that used to live in middleware.ts.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Refresh sessions for every page request and api route, but skip static
  // assets and Next internals — they don't read auth and would just slow
  // every image fetch on the map.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
