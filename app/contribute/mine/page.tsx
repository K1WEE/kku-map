import Link from "next/link";
import { redirect } from "next/navigation";
import StatusBadge from "@/components/contribute/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import type { SubmissionRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function MyContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/contribute/mine");

  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("submitter_id", user.id)
    .order("created_at", { ascending: false })
    .returns<SubmissionRow[]>();

  const submissions = data ?? [];

  return (
    <main className="min-h-dvh bg-(--color-ink-50)">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-(--color-ink-100) bg-(--color-ink-0) px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          aria-label="กลับไปหน้าแผนที่"
          className="grid h-9 w-9 place-items-center rounded-full text-(--color-ink-700) transition hover:bg-(--color-ink-100)"
        >
          <BackIcon />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-(--color-ink-900)">
          การมีส่วนร่วมของฉัน
        </h1>
      </header>

      <div className="mx-auto max-w-screen-sm px-4 py-4">
        {sent && (
          <div className="mb-4 rounded-xl bg-(--color-brand-50) px-3 py-3 text-[13px] text-(--color-brand-800) ring-1 ring-(--color-brand-100)">
            ส่งเรียบร้อย! รอ admin รีวิว ปกติใช้เวลา 1–3 วัน
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-(--color-brand-50) px-3 py-3 text-[13px] text-(--color-brand-800)">
            โหลดข้อมูลล้มเหลว: {error.message}
          </div>
        )}

        {submissions.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {submissions.map((s) => (
              <li key={s.id}>
                <SubmissionCard submission={s} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function SubmissionCard({ submission }: { submission: SubmissionRow }) {
  const payload = submission.payload;
  const name = (payload as { name?: string })?.name ?? "(ไม่มีชื่อ)";
  const typeLabel = submission.type === "add" ? "เพิ่มใหม่" : "แก้ไข";
  const typeIcon = submission.type === "add" ? "🆕" : "✏️";

  return (
    <article className="rounded-2xl bg-(--color-ink-0) p-4 shadow-[0_6px_20px_-12px_oklch(0.2_0.05_25/0.20)] ring-1 ring-(--color-ink-200)">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-(--color-ink-100) text-base"
        >
          {typeIcon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-tight text-(--color-ink-500)">
              {typeLabel}
            </span>
            <StatusBadge status={submission.status} />
          </div>
          <h2 className="mt-0.5 truncate text-[15px] font-medium text-(--color-ink-900)">
            {name}
          </h2>
          <p className="mt-1 text-[11px] text-(--color-ink-500)">
            ส่งเมื่อ {formatThaiDate(submission.created_at)}
          </p>
        </div>
      </div>

      {submission.status === "rejected" && submission.reviewer_note && (
        <p className="mt-3 rounded-lg bg-(--color-ink-50) px-3 py-2 text-[12px] text-(--color-ink-700)">
          <span className="font-medium">เหตุผล: </span>
          {submission.reviewer_note}
        </p>
      )}

      {submission.note && (
        <p className="mt-2 text-[11px] italic text-(--color-ink-500)">
          ข้อความที่ส่ง: {submission.note}
        </p>
      )}
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-(--color-ink-0) p-6 text-center ring-1 ring-(--color-ink-200)">
      <p className="text-[14px] text-(--color-ink-700)">
        ยังไม่เคยส่ง suggestion
      </p>
      <p className="mt-1 text-[12px] text-(--color-ink-500)">
        ของคุณจะช่วยให้แผนที่นี้แม่นยำขึ้นสำหรับน้องๆ ปีต่อไป
      </p>
      <Link
        href="/contribute/new"
        className="mt-4 inline-flex items-center gap-1 rounded-xl bg-(--color-brand-600) px-4 py-2 text-[13px] font-medium text-white transition hover:bg-(--color-brand-700)"
      >
        + เสนอสถานที่ใหม่
      </Link>
    </div>
  );
}

function formatThaiDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "ไม่กี่วินาทีที่แล้ว";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BackIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}
