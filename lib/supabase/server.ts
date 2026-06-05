import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Server-side Supabase client, scoped to the current request.
 *
 * Reads/writes session cookies via Next's `cookies()` store. Use in:
 *   - server components
 *   - route handlers
 *   - server actions
 *
 * Respects RLS — operates as the signed-in user (or anon if no session).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from a server component is a no-op — middleware
            // refreshes the session cookie before render.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — BYPASSES RLS. Server-only. Use sparingly:
 *   - seed script
 *   - admin-only mutations that span tables (e.g. approve submission)
 *
 * Never import this from a client component or expose the key.
 *
 * Untyped on purpose — the Database generic causes type inference to widen
 * to `never` on insert/update in the current @supabase/supabase-js version.
 * Boundary safety is provided by Zod schemas in `lib/admin/schemas.ts`.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
