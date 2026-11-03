import { cn, initials } from "@/lib/utils";
import { Star } from "lucide-react";
/* Badge ------------------------------------------------------------------- */
const tones = {
  neutral: "bg-ink-50 text-ink-600 ring-line",
  success: "bg-success-50 text-success ring-success/20",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  info: "bg-info-50 text-info ring-info/20",
  warn: "bg-warn-50 text-warn ring-warn/20",
  danger: "bg-danger-50 text-danger ring-danger/20",
};
export function Badge({ tone = "neutral", className, children, dot }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
/* Card -------------------------------------------------------------------- */
export function Card({ className, ...props }) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-surface", className)} {...props} />;
}
export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div>
        <h3 className="font-sans text-[15px] font-semibold tracking-normal">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
/* Avatar ------------------------------------------------------------------ */
const avatarColors = [
  "bg-ink-100 text-ink-800",
  "bg-brand-50 text-brand-700",
  "bg-info-50 text-info",
  "bg-success-50 text-success",
];
export function Avatar({ name, size = "md" }) {
  const color = avatarColors[name.length % avatarColors.length];
  const s = size === "sm" ? "size-7 text-[11px]" : size === "lg" ? "size-14 text-lg" : "size-9 text-xs";
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold", color, s)}>{initials(name)}</span>
  );
}
/* Stars ------------------------------------------------------------------- */
export function Stars({ value, className }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-3.5", i <= Math.round(value) ? "fill-star text-star" : "fill-line text-line")} />
      ))}
    </span>
  );
}
/* Empty state ------------------------------------------------------------- */
export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="grid size-12 place-items-center rounded-2xl bg-ink-50 text-brand-600 [&_svg]:size-5">{icon}</div>}
      <h3 className="font-sans text-base font-semibold tracking-normal">{title}</h3>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}
/* Table ------------------------------------------------------------------- */
export function Table({ className, ...props }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }) {
  return (
    <th
      className={cn("whitespace-nowrap border-b border-line bg-paper/60 px-4 py-2.5 text-xs font-medium text-muted", className)}
      {...props}
    />
  );
}
export function Td({ className, ...props }) {
  return <td className={cn("whitespace-nowrap border-b border-line px-4 py-3 align-middle", className)} {...props} />;
}
/* Section heading (public site) ------------------------------------------- */
export function SectionHeading({ title, body, action, className }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
        {body && <p className="mt-3 text-lg text-muted">{body}</p>}
      </div>
      {action}
    </div>
  );
}
