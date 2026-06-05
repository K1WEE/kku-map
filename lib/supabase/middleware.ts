import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/**
 * Refresh the Supabase session on every request so server components see a
 * non-expired token. Called from the project's top-level `middleware.ts`.
 *
 * NOTE: do not put guarded logic here. Auth checks live inside each page so
 * unauthenticated users see the same map as anyone else.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Until Supabase env is wired (Phase 1.B), middleware is a no-op so the
  // dev server keeps starting. After env is set this branch goes away.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touch the session so refresh tokens rotate before the page renders.
  await supabase.auth.getUser();

  return response;
}
