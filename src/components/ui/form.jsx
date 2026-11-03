import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
const field =
  "w-full rounded-[var(--radius-field)] border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-subtle transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-paper disabled:text-muted";
export function Input({ className, ...props }) {
  return <input className={cn(field, "h-11", className)} {...props} />;
}
export function Textarea({ className, ...props }) {
  return <textarea className={cn(field, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}
export function Select({ className, children, ...props }) {
  return (
    <div className="relative">
      <select className={cn(field, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
export function Label({ className, ...props }) {
  return <label className={cn("text-sm font-medium text-ink", className)} {...props} />;
}
export function Field({ label, hint, error, htmlFor, children, className }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-danger">{error}</p> : hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
export function Checkbox({ label, className, ...props }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm text-ink", className)}>
      <input type="checkbox" className="mt-0.5 size-4 rounded border-line-strong accent-brand-600" {...props} />
      <span>{label}</span>
    </label>
  );
}
