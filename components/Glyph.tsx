import { CATEGORY_GLYPH } from "@/lib/icons";
import type { CategoryId } from "@/lib/types";

interface Props {
  id: CategoryId;
  size?: number;
  className?: string;
}

export default function Glyph({ id, size = 18, className }: Props) {
  const paths = CATEGORY_GLYPH[id].split(/(?=M)/).map((d) => d.trim());
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
