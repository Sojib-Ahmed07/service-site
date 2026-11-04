// src/components/admin/providers-table.jsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, CircleAlert, Star, Wrench } from "lucide-react";
import { providerStatus, weekdays as days } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ContactButtons, FilterSelect, FilterTabs, SearchInput } from "@/components/admin/ui";
import { Avatar, Card, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { ProviderBadge } from "@/components/ui/status";

/** Providers list (from the database). Filtering happens here; the list is small. */
export function ProvidersTable({ providers, categories, zones, initialSkill = "all" }) {
  const categoryName = (slug) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const [status, setStatus] = useState("all");
  const [skill, setSkill] = useState(initialSkill);
  const [zone, setZone] = useState("all");
  const [day, setDay] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return providers
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => skill === "all" || p.skills.includes(skill))
      .filter((p) => zone === "all" || p.zones.includes(zone))
      .filter((p) => day === "all" || p.availability.includes(day))
      .filter((p) => !t || `${p.name} ${p.business} ${p.email} ${p.phone}`.toLowerCase().includes(t))
      .sort((a, b) => b.rating - a.rating);
  }, [providers, status, skill, zone, day, q]);

  const tabs = [
    { value: "all", label: "All", count: providers.length },
    ...Object.entries(providerStatus).map(([value, s]) => ({
      value,
      label: s.label,
      count: providers.filter((p) => p.status === value).length,
    })),
  ];

  return (
    <Card className="overflow-hidden">
      <div className="space-y-3 border-b border-line p-3">
        <FilterTabs options={tabs} value={status} onChange={setStatus} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Name, business, phone" />
          <FilterSelect label="Service" value={skill} onChange={setSkill}>
            <option value="all">Any service</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Zone" value={zone} onChange={setZone}>
            <option value="all">Any zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Works on" value={day} onChange={setDay}>
            <option value="all">Any day</option>
            {days.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </FilterSelect>
        </div>
      </div>

      {rows.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Provider</Th>
              <Th>Services</Th>
              <Th>Zones</Th>
              <Th>Days</Th>
              <Th>Rating</Th>
              <Th>Docs</Th>
              <Th>Status</Th>
              <Th>Contact</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const ok = p.compliant;
              return (
                <tr key={p.id} className="hover:bg-paper/60">
                  <Td>
                    <Link href={`/admin/providers/${p.id}`} className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <span>
                        <span className="block font-semibold hover:underline">{p.name}</span>
                        <span className="block text-xs text-muted">{p.business}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="max-w-64 whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      {p.skills.map((s) => (
                        <span
                          key={s}
                          className={cn(
                            "whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs",
                            s === skill ? "bg-ink-900 text-white" : "bg-paper ring-1 ring-line",
                          )}
                        >
                          {categoryName(s)}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td className="max-w-48 whitespace-normal text-xs text-muted">{p.zones.join(", ")}</Td>
                  <Td>
                    <div className="flex gap-0.5">
                      {days.map((d) => (
                        <span
                          key={d}
                          title={d}
                          className={cn(
                            "grid size-5 place-items-center rounded text-[10px] font-semibold",
                            p.availability.includes(d) ? "bg-ink-100 text-ink-800" : "bg-paper text-subtle",
                          )}
                        >
                          {d[0]}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1">
                      <Star className="size-3.5 fill-star text-star" /> {p.rating.toFixed(1)}
                      <span className="text-xs text-muted">({p.jobs} done)</span>
                    </span>
                  </Td>
                  <Td>
                    {ok ? (
                      <BadgeCheck className="size-5 text-brand-600" aria-label="All documents verified" />
                    ) : (
                      <span title={`Missing: ${p.missing.join(", ")}`}>
                        <CircleAlert className="size-5 text-warn" aria-label={`Missing: ${p.missing.join(", ")}`} />
                      </span>
                    )}
                  </Td>
                  <Td>
                    <ProviderBadge status={p.status} />
                  </Td>
                  <Td>
                    <ContactButtons phone={p.phone} email={p.email} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<Wrench />}
          title="No providers match"
          body="Try another service, zone or day — or add a new provider."
        />
      )}
    </Card>
  );
}