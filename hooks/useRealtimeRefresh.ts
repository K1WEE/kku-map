"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Options {
  /**
   * Supabase publication table to subscribe to. Must be on the
   * `supabase_realtime` publication (see migration 0001).
   */
  table: string;
  /** Called (debounced) when an insert/update/delete fires for the table. */
  onChange: () => void;
  /**
   * Debounce window. Approving a submission can flip two tables back-to-back
   * (places + submissions); a small wait coalesces them into one refetch.
   */
  debounceMs?: number;
}

/**
 * Subscribe to a Postgres-changes channel and trigger a debounced refresh
 * handler whenever something changes. The hook owns the channel lifecycle
 * (create on mount, remove on unmount); the caller decides what "refresh"
 * means — `router.refresh()`, a refetch, a cache invalidate.
 *
 * The debounce matters mostly for the admin queue: an approve flow updates
 * both `places` and `submissions`, and if both subscriptions fire we want
 * a single refetch, not two.
 */
export function useRealtimeRefresh({ table, onChange, debounceMs = 250 }: Options) {
  useEffect(() => {
    // Skip when Supabase isn't configured — keeps local dev usable before
    // env is wired without crashing the hook.
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function fireDebounced() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onChange();
      }, debounceMs);
    }

    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        // The `as any` is a known Supabase types quirk — postgres_changes is
        // the documented event but its TS shape is over-narrow in this lib
        // version. Runtime contract is correct.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        fireDebounced,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            `[realtime:${table}] subscription ${status} — falling back to manual refresh`,
          );
        }
      });

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [table, onChange, debounceMs]);
}
