import { notFound, redirect } from "next/navigation";
import AdminClient from "./AdminClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Admin entry. Two-tier guard:
 *   1. No session → /login (we know the user might want to sign in)
 *   2. Signed in but no admin flag → notFound() to hide the surface entirely
 *
 * notFound (not 403) is deliberate: this page shouldn't reveal its own
 * existence to non-admins. Treat the URL as if it didn't exist.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle<{ is_admin: boolean }>();

  if (!profile?.is_admin) notFound();

  return <AdminClient />;
}
