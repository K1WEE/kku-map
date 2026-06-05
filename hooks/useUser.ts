"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

interface State {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

/**
 * Client hook for the signed-in user + their profile row.
 *
 * The auth state update and the profile fetch are decoupled on purpose: the
 * profile query goes through RLS and can be slow (or even stall) right after
 * sign-in while the JWT propagates. Gating `user` on the profile would leave
 * the UI in a signed-out state for the entire pause. Instead `user` flips as
 * soon as the session is known; `profile` (admin flag, display name) trickles
 * in when it's available.
 */
export function useUser(): State {
  const [state, setState] = useState<State>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadProfile(userId: string) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle<Profile>();
        if (error) console.warn("[useUser] profile load failed", error);
        if (cancelled) return;
        setState((prev) =>
          prev.user?.id === userId ? { ...prev, profile: data ?? null } : prev,
        );
      } catch (err) {
        console.warn("[useUser] profile load threw", err);
      }
    }

    function apply(user: User | null) {
      if (cancelled) return;
      setState({ user, profile: null, loading: false });
      if (user) void loadProfile(user.id);
    }

    // onAuthStateChange fires with INITIAL_SESSION (or SIGNED_IN) on subscribe
    // — covers the initial bootstrap without a separate getSession() call.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
