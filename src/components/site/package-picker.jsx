// src/components/site/package-picker.jsx
"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Plus } from "lucide-react";
import { cn, money } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

/**
 * Package + add-on selection on a service page, with a sticky price summary.
 * The selection is carried into /book/[slug] through the query string.
 */
export function PackagePicker({ category, packages, addOns, suburb, freeChangeHours = 24, children }) {
  const [pkgId, setPkgId] = useState((packages.find((p) => p.popular) ?? packages[0])?.id);
  const [extras, setExtras] = useState([]);

  const pkg = packages.find((p) => p.id === pkgId);
  const extrasTotal = addOns.filter((a) => extras.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const total = (pkg?.price ?? 0) + extrasTotal;

  const href = useMemo(() => {
    const qs = new URLSearchParams({ pkg: pkgId ?? "" });
    if (extras.length) qs.set("addons", extras.join(","));
    if (suburb) qs.set("suburb", suburb);
    return `/book/${category.slug}?${qs.toString()}`;
  }, [category.slug, pkgId, extras, suburb]);

  const toggle = (id) => setExtras((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]));

  return (
    <div className="container-x grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-14">
        <section>
          <h2 className="text-2xl font-semibold">Choose a package</h2>
          <div role="radiogroup" aria-label="Package" className="mt-5 grid gap-3 sm:grid-cols-2">
            {packages.map((p) => {
              const active = p.id === pkgId;
              return (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPkgId(p.id)}
                  className={cn(
                    "relative flex flex-col rounded-[var(--radius-card)] border-2 bg-surface p-5 text-left transition-colors",
                    active ? "border-ink-900 bg-ink-50/40" : "border-line hover:border-line-strong",
                  )}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-5 rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-semibold text-ink">
                      Most booked
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{p.name}</p>
                      <p className="mt-0.5 text-sm text-muted">{p.summary}</p>
                    </div>
                    <span
                      className={cn(
                        "mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2",
                        active ? "border-ink-900 bg-ink-900 text-white" : "border-line-strong",
                      )}
                    >
                      {active && <Check className="size-3" strokeWidth={3.5} />}
                    </span>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {p.includes.map((i) => (
                      <li key={i} className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">
                        {i}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex items-end justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-muted">
                      <Clock className="size-3.5" /> {p.duration}
                    </span>
                    <span className="font-display text-2xl font-semibold">{money(p.price)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {addOns.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold">Add extras</h2>
            <p className="mt-1 text-muted">Optional. Your pro will bring everything needed.</p>
            <div className="mt-5 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
              {addOns.map((a) => {
                const on = extras.includes(a.id);
                return (
                  <label key={a.id} className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-paper/60">
                    <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="size-4 accent-ink-900" />
                    <span className="flex-1 font-medium">{a.name}</span>
                    <span className="text-muted">+{money(a.price)}</span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {children}
      </div>

      {/* Summary: sticky on desktop, a bottom bar on mobile */}
      <aside className="hidden lg:block">
        <div className="sticky top-28 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-lift)]">
          <p className="text-sm text-muted">{category.name}</p>
          <p className="mt-1 text-lg font-semibold">{pkg?.name}</p>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted">Package</dt>
              <dd>{money(pkg?.price ?? 0)}</dd>
            </div>
            {addOns
              .filter((a) => extras.includes(a.id))
              .map((a) => (
                <div key={a.id} className="flex justify-between">
                  <dt className="flex items-center gap-1 text-muted">
                    <Plus className="size-3" /> {a.name}
                  </dt>
                  <dd>{money(a.price)}</dd>
                </div>
              ))}
          </dl>
          <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
            <span className="text-sm text-muted">Total, GST incl.</span>
            <span className="font-display text-3xl font-semibold">{money(total)}</span>
          </div>
          <ButtonLink href={href} size="lg" className="mt-5 w-full">
            Choose a time
          </ButtonLink>
          {freeChangeHours > 0 && (
            <p className="mt-3 text-center text-xs text-muted">
              Free changes up to {freeChangeHours} hours before your booking.
            </p>
          )}
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted">{pkg?.name}</p>
            <p className="font-display text-xl font-semibold">{money(total)}</p>
          </div>
          <ButtonLink href={href} size="lg">
            Choose a time
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}