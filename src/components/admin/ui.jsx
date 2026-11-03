import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/** Title row for every admin screen. */
export function AdminHeader({ title, description, actions, back }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({ label, value, delta, hint, tone = "default" }) {
  const up = typeof delta === "number" && delta >= 0;
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border p-5",
        tone === "alert" ? "border-brand-400 bg-brand-50/60" : "border-line bg-surface",
      )}
    >
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
      {(delta !== undefined || hint) && (
        <p className="mt-1 text-sm">
          {delta !== undefined && (
            <span className={up ? "font-medium text-brand-600" : "font-medium text-danger"}>
              {up ? "+" : ""}
              {delta}%
            </span>
          )}
          {hint && <span className="text-muted"> {hint}</span>}
        </p>
      )}
    </div>
  );
}

/** Simple, dependency-free bar chart. Swap for Recharts later if you need more. */
export function BarChart({ data, valueKey, labelKey, format = (v) => v, height = 200 }) {
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d[valueKey] / max) * (height - 40));
        const last = i === data.length - 1;
        return (
          <div key={d[labelKey]} className="group flex flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[11px] font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">
              {format(d[valueKey])}
            </span>
            <div
              className={cn(
                "w-full rounded-t-md transition-colors",
                last ? "bg-brand-600" : "bg-ink-300 group-hover:bg-brand-500",
              )}
              style={{ height: h }}
            />
            <span className="whitespace-nowrap text-[11px] text-muted">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

/** One-tap contact links for reaching a provider or customer (phone, SMS, email). */
export function ContactButtons({ phone, email, size = "sm" }) {
  const tel = phone?.replace(/\s/g, "");
  const cls = cn(
    "inline-grid place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-brand-500 hover:text-ink-900",
    size === "sm" ? "size-8 [&_svg]:size-3.5" : "size-10 [&_svg]:size-4",
  );
  return (
    <div className="flex gap-1.5">
      {phone && (
        <a href={`tel:${tel}`} className={cls} aria-label={`Call ${phone}`} title={`Call ${phone}`}>
          <Phone />
        </a>
      )}
      {phone && (
        <a href={`sms:${tel}`} className={cls} aria-label={`Text ${phone}`} title={`Text ${phone}`}>
          <MessageSquare />
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={cls} aria-label={`Email ${email}`} title={`Email ${email}`}>
          <Mail />
        </a>
      )}
    </div>
  );
}

/** Pill tabs for status filters, with counts. */
export function FilterTabs({ options, value, onChange }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-ink-900 text-white" : "text-muted hover:bg-surface hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-xs", value === o.value ? "bg-white/20" : "bg-line")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Compact select used in filter bars. */
export function FilterSelect({ value, onChange, children, label }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-lg border border-line bg-surface pl-3 pr-8 text-sm outline-none focus:border-brand-500"
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      >
        <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search" }) {
  return (
    <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm focus-within:border-brand-500 sm:max-w-xs">
      <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-muted" aria-hidden>
        <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{placeholder}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none placeholder:text-subtle"
      />
    </label>
  );
}
