"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { categories, suburbs } from "@/lib/data";
import { money } from "@/lib/utils";
import { Photo } from "@/components/ui/photo";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [suburb, setSuburb] = useState("");
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef(undefined);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return categories.filter((c) => c.popular);
    return categories.filter((c) => c.name.toLowerCase().includes(t) || c.short.toLowerCase().includes(t)).slice(0, 6);
  }, [q]);

  const go = (slug) => {
    const target = slug ?? (q.trim() ? matches[0]?.slug : undefined);
    const params = suburb ? `?suburb=${encodeURIComponent(suburb)}` : "";
    router.push(target ? `/services/${target}${params}` : `/services${params}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="relative"
    >
      <div className="flex flex-col rounded-2xl border border-line-strong bg-white p-1.5 shadow-[var(--shadow-lift)] sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-3 px-3.5 py-3">
          <Search className="size-5 shrink-0 text-ink-400" />
          <span className="sr-only">What do you need done?</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              clearTimeout(blurTimer.current);
              setFocused(true);
            }}
            onBlur={() => (blurTimer.current = setTimeout(() => setFocused(false), 150))}
            placeholder="What do you need done?"
            className="w-full bg-transparent text-base outline-none placeholder:text-subtle"
            autoComplete="off"
          />
        </label>
        <div className="hidden h-7 w-px bg-line sm:block" />
        <label className="flex items-center gap-3 border-t border-line px-3.5 py-3 sm:border-0">
          <MapPin className="size-5 shrink-0 text-ink-400" />
          <span className="sr-only">Suburb</span>
          <select
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            className="w-full appearance-none bg-transparent text-base outline-none sm:w-36"
          >
            <option value="">Suburb</option>
            {suburbs.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-12 rounded-xl bg-brand-500 px-6 font-semibold text-ink-950 transition-colors hover:bg-brand-400"
        >
          Search
        </button>
      </div>

      {focused && matches.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[var(--shadow-float)] sm:right-auto sm:w-[28rem]">
          <p className="px-3 pb-1.5 pt-2 text-xs font-medium text-subtle">{q ? "Matching services" : "Popular right now"}</p>
          {matches.map((c) => (
            <button
              key={c.slug}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(c.slug)}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-ink-50"
            >
              <Photo src={c.image} sizes={120} className="size-10 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{c.name}</span>
                <span className="block truncate text-sm text-muted">{c.short}</span>
              </span>
              <span className="tabular whitespace-nowrap text-sm text-muted">from {money(c.fromPrice)}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
