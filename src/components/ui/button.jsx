import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0";

const variants = {
  primary: "bg-ink-900 text-white hover:bg-ink-700 active:bg-ink-950",
  accent: "bg-brand-500 text-ink-950 hover:bg-brand-400 active:bg-brand-600",
  outline: "border border-line-strong bg-surface text-ink hover:border-ink-400 hover:bg-ink-50",
  ghost: "text-ink hover:bg-ink-50",
  subtle: "bg-ink-50 text-ink hover:bg-ink-100",
  danger: "bg-danger text-white hover:bg-danger/90",
  inverse: "bg-white text-ink-900 hover:bg-ink-100",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
  icon: "size-9",
};

export function buttonClass(variant = "primary", size = "md", className) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({ variant = "primary", size = "md", className, ...props }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
