"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client. Reads NEXT_PUBLIC_* env vars, picks up the
 * session from cookies, and supports realtime subscriptions.
 *
 * Use in client components and hooks. For server components / route handlers
 * import from `./server` instead.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
