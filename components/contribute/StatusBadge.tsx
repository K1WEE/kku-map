import type { SubmissionStatus } from "@/lib/supabase/types";

/**
 * Pill badge for submission status. Tones are deliberately muted (low
 * saturation OKLCH) so they sit in a calm product chrome instead of
 * shouting status-bar green/red. Each pill carries label + a dot so the
 * status reads at a glance without relying solely on color.
 */
const STYLES: Record<
  SubmissionStatus,
  { label: string; bg: string; ink: string; dot: string }
> = {
  pending: {
    label: "รอรีวิว",
    bg: "oklch(0.96 0.05 75)",
    ink: "oklch(0.40 0.13 75)",
    dot: "oklch(0.70 0.16 75)",
  },
  approved: {
    label: "อนุมัติแล้ว",
    bg: "oklch(0.95 0.04 145)",
    ink: "oklch(0.36 0.10 145)",
    dot: "oklch(0.58 0.12 145)",
  },
  rejected: {
    label: "ไม่อนุมัติ",
    bg: "oklch(0.95 0.03 25)",
    ink: "oklch(0.38 0.10 25)",
    dot: "oklch(0.58 0.14 25)",
  },
};

export default function StatusBadge({ status }: { status: SubmissionStatus }) {
  const s = STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-tight"
      style={{ background: s.bg, color: s.ink }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.dot }}
      />
      {s.label}
    </span>
  );
}
