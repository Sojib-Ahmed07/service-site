// src/components/site/suburb-checker.jsx
"use client";

import { useState } from "react";
import { CircleCheck, CircleX, MapPin } from "lucide-react";
import { money } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

/** suburbs come from the database (passed by app/(site)/areas/page.jsx). */
export function SuburbChecker({ suburbs = [] }) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const match = t ? suburbs.find((s) => s.name.toLowerCase() === t || s.postcode === t) : null;
  const suggestions = t && !match ? suburbs.filter((s) => s.name.toLowerCase().startsWith(t)).slice(0, 5) : [];

  return (
    <div>
      <label className="flex h-14 items-center gap-3 rounded-full border border-line-strong bg-surface px-5 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-ink-100">
        <MapPin className="size-5 text-brand-600" />
        <span className="sr-only">Suburb or postcode</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suburb or postcode, e.g. Kingston or 7050"
          className="w-full bg-transparent text-base outline-none placeholder:text-subtle"
        />
      </label>

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => setQ(s.name)}
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-brand-500"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {match && (
        <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-ink-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-brand-600" />
            <span>
              <span className="block font-semibold">We cover {match.name}.</span>
              <span className="text-sm text-muted">
                {match.zone}. {match.surcharge ? `A ${money(match.surcharge)} travel fee applies.` : "No travel fee."}
              </span>
            </span>
          </p>
          <ButtonLink href={`/services?suburb=${encodeURIComponent(match.name)}`}>See services</ButtonLink>
        </div>
      )}

      {t.length > 2 && !match && suggestions.length === 0 && (
        <p className="mt-4 flex items-start gap-3 rounded-2xl bg-warn-50 p-5">
          <CircleX className="mt-0.5 size-5 shrink-0 text-warn" />
          <span>
            <span className="block font-semibold">We don’t cover that area yet.</span>
            <span className="text-sm text-muted">Send us a message and we’ll let you know when we do.</span>
          </span>
        </p>
      )}
    </div>
  );
}