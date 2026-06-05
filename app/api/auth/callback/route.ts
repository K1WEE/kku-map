import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase OAuth callback. After Google sends the user back here with
 * `?code=...`, we exchange it for a session cookie and bounce to the
 * original page (`?next=...`, defaults to `/`).
 *
 * Cookies are bound DIRECTLY to the redirect response so the session
 * persists across the redirect. Going through `next/headers cookies()`
 * here is unreliable in Next 16 + @supabase/ssr because cookies set
 * after async calls sometimes drop on redirect.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL(`${next}?auth_error=missing_code`, url.origin),
    );
  }

  // Build the redirect response FIRST so the Supabase client can write
  // cookies onto it directly. The final redirect must use this same
  // response object — otherwise the cookies it wrote get dropped.
  const response = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    return NextResponse.redirect(
      new URL(`${next}?auth_error=exchange_failed`, url.origin),
    );
  }

  return response;
}

/**
 * Only allow `next` values that point back at this origin, to avoid open
 * redirects. Falls back to `/`.
 */
function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
