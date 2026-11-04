// src/components/site/logo.jsx
import Link from "next/link";
import { site as defaults } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Mark: a hi-vis tile with a tick — the job, done. */
export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-brand-500)" />
      <path
        d="M9 16.5l4.6 4.6L23.5 11"
        fill="none"
        stroke="var(--color-ink-900)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** `name` is the business name from Settings; falls back to the default brand name. */
export function Logo({ inverse, href = "/", name = defaults.name }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label={`${name} home`}>
      <LogoMark className="size-7" />
      <span className={cn("text-[21px] font-semibold tracking-[-0.04em]", inverse ? "text-white" : "text-ink")}>
        {name.toLowerCase()}
      </span>
    </Link>
  );
}