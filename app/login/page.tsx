"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Fallback sign-in page for guards that redirect with `?next=`. Most users
 * actually sign in via AuthButton on the map; this page exists so
 * `redirect('/login?next=/admin')` has somewhere to land.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-(--color-ink-50) px-4">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </main>
  );
}

function LoginCard() {
  const params = useSearchParams();
  const next = sanitizeNext(params.get("next"));
  const error = params.get("auth_error");
  const [signingIn, setSigningIn] = useState(false);

  async function signIn() {
    setSigningIn(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      console.error("signInWithOAuth failed", error);
      setSigningIn(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-(--color-ink-0) p-8 shadow-[0_18px_40px_-12px_oklch(0.2_0.05_25/0.30)] ring-1 ring-(--color-ink-200)">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-(--color-brand-600) text-[14px] font-bold tracking-tight text-white">
        KKU
      </div>
      <h1 className="mt-4 text-center text-[18px] font-semibold text-(--color-ink-900)">
        เข้าสู่ระบบ
      </h1>
      <p className="mt-1 text-center text-[13px] leading-relaxed text-(--color-ink-600)">
        เพื่อช่วยเสนอเพิ่ม/แก้ไขสถานที่
        <br />
        บนแผนที่ ม.ขอนแก่น
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-(--color-brand-50) px-3 py-2 text-[12px] text-(--color-brand-800)">
          เกิดข้อผิดพลาดในการเข้าสู่ระบบ ลองอีกครั้งนะ
        </p>
      )}

      <button
        type="button"
        onClick={signIn}
        disabled={signingIn}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-ink-900) px-3 py-3 text-[15px] font-medium text-(--color-ink-0) transition hover:bg-(--color-ink-800) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-brand-600) disabled:opacity-60"
      >
        <GoogleGMark />
        {signingIn ? "กำลังเปิด Google..." : "เข้าสู่ระบบด้วย Google"}
      </button>

      <Link
        href={next}
        className="mt-3 block text-center text-[12px] text-(--color-ink-500) hover:text-(--color-ink-700)"
      >
        ข้ามไปก่อน
      </Link>
    </div>
  );
}

function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function GoogleGMark() {
  return (
    <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden>
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
