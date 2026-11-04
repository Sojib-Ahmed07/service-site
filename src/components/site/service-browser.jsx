// src/components/site/service-browser.jsx
"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { serviceGroups } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ServiceCard } from "@/components/site/sections";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

/** categories come from the database (passed by app/(site)/services/page.jsx). */
export function ServiceBrowser({ categories = [], initialQuery = "", initialGroup = "All", suburb = "" }) {
  const groups = ["All", ...serviceGroups.filter((g) => categories.some((c) => c.group === g))];
  const [q, setQ] = useState(initialQuery);
  const [group, setGroup] = useState(groups.includes(initialGroup) ? initialGroup : "All");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return categories.filter(
      (c) =>
        (group === "All" || c.group === group) &&
        (!t || c.name.toLowerCase().includes(t) || c.short.toLowerCase().includes(t) || c.description.toLowerCase().includes(t)),
    );
  }, [q, group, categories]);

  return (
    <section className="container-x py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                group === g ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-surface hover:border-brand-500",
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <label className="flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 md:w-80">
          <Search className="size-4 text-muted" />
          <span className="sr-only">Search services</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search, e.g. oven, spiders, mowing"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-subtle"
          />
        </label>
      </div>

      {suburb && (
        <p className="mt-5 text-sm text-muted">
          Showing prices for <span className="font-medium text-ink">{suburb}</span>. Travel fees, if any, are added at checkout.
        </p>
      )}

      {list.length ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => (
            <ServiceCard key={c.slug} c={c} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface">
          <EmptyState
            icon={<Search />}
            title={q ? `No services match “${q}”` : "No services in this group yet"}
            body="Try a broader word, or tell us what you need and we’ll quote it."
            action={
              <ButtonLink href="/contact" variant="outline" size="sm">
                Request a custom quote
              </ButtonLink>
            }
          />
        </div>
      )}
    </section>
  );
}