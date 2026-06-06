import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AdminContext {
  /** Auth user id — handy for stamping `reviewer_id` on submission updates. */
  userId: string;
}

/**
 * API guard: ensures the caller is signed in AND has `profiles.is_admin`.
 * Returns the admin context on success, or a NextResponse to short-circuit
 * the route handler on failure.
 *
 * Use shape:
 *   const auth = await requireAdmin();
 *   if (auth instanceof NextResponse) return auth;
 *   // …authenticated admin work here, `auth.userId` is set
 *
 * Reads `is_admin` via the user-bound client so RLS catches any policy
 * regression — if the policy is misconfigured we get a 403 instead of
 * silently allowing the request through.
 */
export async function requireAdmin(): Promise<AdminContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ต้องเข้าสู่ระบบ" },
      { status: 401 },
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle<{ is_admin: boolean }>();

  if (error) {
    console.error("[requireAdmin] profile lookup failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return { userId: user.id };
}
