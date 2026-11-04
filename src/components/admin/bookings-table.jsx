// src/components/admin/bookings-table.jsx
"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { bookingStatus } from "@/lib/constants";
import { formatISODate } from "@/lib/dates";
import { cn, money } from "@/lib/utils";
import { FilterSelect, FilterTabs, SearchInput } from "@/components/admin/ui";
import { Pager } from "@/components/admin/pager";
import { useDebouncedSearch, useQueryState } from "@/components/admin/use-query-state";
import { Card, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { BookingBadge, PaymentBadge } from "@/components/ui/status";

/**
 * Bookings list. Filtering, search, sort and paging happen on the server
 * (listBookings in src/server/queries/admin.js); this component only edits the URL.
 */
export function BookingsTable({ data, filters, options }) {
  const { set, pending } = useQueryState();
  const [q, setQ] = useDebouncedSearch(filters.q, (v) => set({ q: v }));

  const tabs = [
    { value: "all", label: "All", count: data.statusCounts.all ?? 0 },
    ...Object.entries(bookingStatus).map(([value, s]) => ({
      value,
      label: s.label,
      count: data.statusCounts[value] ?? 0,
    })),
  ];

  return (
    <Card className={cn("overflow-hidden transition-opacity", pending && "opacity-60")}>
      <div className="space-y-3 border-b border-line p-3">
        <FilterTabs options={tabs} value={filters.status} onChange={(v) => set({ status: v })} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Booking ID, customer, suburb, provider" />
          <FilterSelect label="Service" value={filters.category} onChange={(v) => set({ category: v })}>
            <option value="all">All services</option>
            {options.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Zone" value={filters.zone} onChange={(v) => set({ zone: v })}>
            <option value="all">All zones</option>
            {options.zones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Sort" value={filters.sort} onChange={(v) => set({ sort: v === "date" ? "" : v })}>
            <option value="date">Sort: job date</option>
            <option value="newest">Sort: newest booked</option>
            <option value="value">Sort: highest value</option>
          </FilterSelect>
        </div>
      </div>

      {data.rows.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Booking</Th>
              <Th>Customer</Th>
              <Th>Service</Th>
              <Th>When</Th>
              <Th>Provider</Th>
              <Th>Status</Th>
              <Th>Payment</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((b) => (
              <tr key={b.id} className="hover:bg-paper/60">
                <Td>
                  <Link href={`/admin/bookings/${b.id}`} className="font-semibold text-ink-900 hover:underline">
                    {b.id}
                  </Link>
                </Td>
                <Td>
                  {b.customerName}
                  <span className="block text-xs text-muted">{b.suburb}</span>
                </Td>
                <Td>{b.categoryName}</Td>
                <Td>
                  {formatISODate(b.date, { weekday: "short", day: "numeric", month: "short" })}
                  <span className="block text-xs text-muted">{b.slot}</span>
                </Td>
                <Td>
                  {b.providerName ? (
                    b.providerName
                  ) : b.status === "cancelled" ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <Link href={`/admin/bookings/${b.id}#assign`} className="font-medium text-warn hover:underline">
                      Assign now
                    </Link>
                  )}
                </Td>
                <Td>
                  <BookingBadge status={b.status} />
                </Td>
                <Td>
                  <PaymentBadge status={b.payment} />
                </Td>
                <Td className="text-right font-medium">{money(b.total)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<CalendarRange />}
          title="No bookings match these filters"
          body="Clear a filter or try a different search."
        />
      )}
      <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: p > 1 ? p : "" })} />
    </Card>
  );
}