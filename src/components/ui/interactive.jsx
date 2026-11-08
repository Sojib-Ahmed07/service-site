// src/components/ui/interactive.jsx
"use client";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
/* Switch ------------------------------------------------------------------ */
export function Switch({ checked, onChange, label, defaultChecked }) {
  const [inner, setInner] = useState(defaultChecked ?? false);
  const on = checked ?? inner;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        setInner(!on);
        onChange?.(!on);
      }}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors",
        on ? "bg-ink-900" : "bg-line-strong",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
/* Tabs -------------------------------------------------------------------- */
export function Tabs({ tabs, defaultTab, className }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  return (
    <div className={className}>
      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              active === t.id ? "border-ink-900 text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-5">{tabs.find((t) => t.id === active)?.content}</div>
    </div>
  );
}
/* Segmented control ------------------------------------------------------- */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
/* Accordion --------------------------------------------------------------- */
export function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  const id = useId();
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((it, i) => (
        <div key={it.q}>
          <button
            className="flex w-full items-center justify-between gap-6 py-5 text-left"
            aria-expanded={open === i}
            aria-controls={`${id}-${i}`}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-[17px] font-medium">{it.q}</span>
            <ChevronDown className={cn("size-5 shrink-0 text-muted transition-transform", open === i && "rotate-180")} />
          </button>
          <div id={`${id}-${i}`} hidden={open !== i} className="pb-5 pr-10 text-muted leading-relaxed">
            {it.a}
          </div>
        </div>
      ))}
    </div>
  );
}
/* Modal ------------------------------------------------------------------- */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  const w = size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-2xl" : "max-w-lg";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl", w)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="font-sans text-lg font-semibold tracking-normal">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-paper hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-paper/50 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}
/* Toast (minimal) --------------------------------------------------------- */
export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    // Longer messages (e.g. "saved, but the email wasn't sent…") stay up long enough to read.
    const t = setTimeout(() => setMsg(null), String(msg).length > 60 ? 6500 : 2800);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl bg-ink-900 px-5 py-3 text-center text-sm font-medium text-white shadow-xl"
    >
      {msg}
    </div>
  ) : null;
  return { toast: setMsg, toastNode: node };
}