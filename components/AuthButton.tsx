"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

/**
 * Header chip for sign in / signed-in identity. 36px circle in the top-right
 * safe-area strip — out of the way of the search bar but still thumb-reachable
 * on a phone held one-handed.
 *
 * - Signed out: person icon, click opens a dropdown with the Google sign-in CTA
 * - Signed in:  Google avatar (or initial fallback), click opens a menu with
 *               profile info, links, and sign out
 *
 * The dropdown lives inside the same container; z-(--z-dropdown) keeps it
 * above the search bar's own dropdown.
 */
export default function AuthButton() {
  const { user, profile, loading } = useUser();
  const [open, setOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signInWithGoogle() {
    setSigningIn(true);
    const supabase = createClient();
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${next}`,
      },
    });
    if (error) {
      setSigningIn(false);
      // Surface the error inline; the OAuth flow normally navigates away
      // before we render this, so this is only hit on outright failure.
      console.error("signInWithOAuth failed", error);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
  }

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const displayName =
    profile?.display_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "";
  const initial = (displayName || user?.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? "บัญชีของคุณ" : "เข้าสู่ระบบ"}
        aria-busy={loading}
        className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-(--color-ink-0) text-(--color-ink-700) shadow-[0_6px_20px_-8px_oklch(0.2_0.05_25/0.25)] ring-1 ring-(--color-ink-200) transition hover:bg-(--color-ink-50) hover:text-(--color-ink-900) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-600) aria-busy:opacity-70"
      >
        {user ? (
          avatarUrl ? (
            // Google avatar — img is fine here; not LCP, not in a list
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-12 w-12 place-items-center rounded-full bg-(--color-brand-600) text-[15px] font-semibold text-white"
            >
              {initial}
            </span>
          )
        ) : (
          <PersonIcon />
        )}
      </button>

      {open &&
        (user ? (
          <SignedInMenu
            email={user.email ?? ""}
            displayName={displayName}
            isAdmin={profile?.is_admin ?? false}
            onSignOut={signOut}
          />
        ) : (
          <SignedOutMenu signingIn={signingIn} onSignIn={signInWithGoogle} />
        ))}
    </div>
  );
}

function SignedOutMenu({
  signingIn,
  onSignIn,
}: {
  signingIn: boolean;
  onSignIn: () => void;
}) {
  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-(--z-dropdown) mt-2 w-72 rounded-2xl bg-(--color-ink-0) p-4 shadow-[0_18px_40px_-12px_oklch(0.2_0.05_25/0.30)] ring-1 ring-(--color-ink-200)"
    >
      <p className="text-[13px] leading-relaxed text-(--color-ink-700)">
        เข้าสู่ระบบเพื่อช่วยเสนอเพิ่ม/แก้ไขสถานที่บนแผนที่
      </p>
      <button
        type="button"
        role="menuitem"
        onClick={onSignIn}
        disabled={signingIn}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-ink-900) px-3 py-2.5 text-[14px] font-medium text-(--color-ink-0) transition hover:bg-(--color-ink-800) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-600) disabled:opacity-60"
      >
        <GoogleGMark />
        {signingIn ? "กำลังเปิด Google..." : "เข้าสู่ระบบด้วย Google"}
      </button>
    </div>
  );
}

function SignedInMenu({
  email,
  displayName,
  isAdmin,
  onSignOut,
}: {
  email: string;
  displayName: string;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-(--z-dropdown) mt-2 w-64 rounded-2xl bg-(--color-ink-0) py-2 shadow-[0_18px_40px_-12px_oklch(0.2_0.05_25/0.30)] ring-1 ring-(--color-ink-200)"
    >
      <div className="px-4 py-2">
        <p className="truncate text-[13px] font-medium text-(--color-ink-800)">
          {displayName}
        </p>
        <p className="truncate text-[11px] text-(--color-ink-500)">{email}</p>
        {isAdmin && (
          <span className="mt-1 inline-block rounded-md bg-(--color-brand-50) px-1.5 py-0.5 text-[10px] font-medium tracking-tight text-(--color-brand-700)">
            admin
          </span>
        )}
      </div>
      <hr className="my-1 border-(--color-ink-100)" />
      <MenuLink href="/contribute/mine">การมีส่วนร่วมของฉัน</MenuLink>
      {isAdmin && <MenuLink href="/admin">หน้า admin</MenuLink>}
      <hr className="my-1 border-(--color-ink-100)" />
      <button
        type="button"
        role="menuitem"
        onClick={onSignOut}
        className="block w-full px-4 py-2 text-left text-[13px] text-(--color-ink-700) transition hover:bg-(--color-ink-50) hover:text-(--color-ink-900) focus-visible:outline-none focus-visible:bg-(--color-ink-50)"
      >
        ออกจากระบบ
      </button>
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="block px-4 py-2 text-[13px] text-(--color-ink-700) transition hover:bg-(--color-ink-50) hover:text-(--color-ink-900) focus-visible:outline-none focus-visible:bg-(--color-ink-50)"
    >
      {children}
    </Link>
  );
}

function PersonIcon() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

function GoogleGMark() {
  // Official Google "G" mark, simplified inline.
  return (
    <svg width={16} height={16} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.5 4.2-5.5 7.2-11.3 7.2-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.1-5.1C33.5 5.1 29 3.2 24 3.2 12.6 3.2 3.2 12.6 3.2 24S12.6 44.8 24 44.8c12 0 19.6-8.4 19.6-20.8 0-1.2-.1-2.3-.3-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M5.3 14.7l5.9 4.3C12.9 15 18 11 24 11c3 0 5.7 1.1 7.8 2.9l5.1-5.1C33.5 5.1 29 3.2 24 3.2c-7.6 0-14 4.1-17.7 10.4l-1 1.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44.8c4.8 0 9.2-1.8 12.5-4.9l-5.8-4.8c-1.8 1.3-4.1 2.1-6.7 2.1-5.8 0-10.6-3.7-12.4-8.8l-5.9 4.5C9 39.1 16 44.8 24 44.8z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-.7 2-2 3.7-3.6 4.9l5.8 4.8c-.4.4 6.4-4.7 6.4-13.3 0-1.3-.1-2.4-.3-3.5z"
      />
    </svg>
  );
}
