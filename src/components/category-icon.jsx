import { cn } from "@/lib/utils";
import { Bug, Droplets, Grid2x2, Hammer, House, KeyRound, Leaf, Sofa, Sparkles, SprayCan, Truck, Zap } from "lucide-react";

const map = {
  cleaning: Sparkles,
  lease: KeyRound,
  pest: Bug,
  carpet: Sofa,
  garden: Leaf,
  handyman: Hammer,
  gutter: House,
  window: Grid2x2,
  electrical: Zap,
  plumbing: Droplets,
  removals: Truck,
  pressure: SprayCan,
};

/** Line icon in a quiet neutral tile. Used in lists, admin and the booking summary. */
export function CategoryIcon({ icon, className, size = "md" }) {
  const Icon = map[icon] ?? Sparkles;
  const s =
    size === "sm"
      ? "size-8 rounded-lg [&_svg]:size-4"
      : size === "lg"
        ? "size-14 rounded-2xl [&_svg]:size-6"
        : "size-10 rounded-xl [&_svg]:size-[18px]";
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center bg-ink-50 text-ink-800 ring-1 ring-inset ring-line", s, className)}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}
