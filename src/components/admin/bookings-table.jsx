"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import { bookingStatus, bookings, categories, getCategory, getCustomer, getProvider, getSuburb, zones } from "@/lib/data";
import { formatDate, money } from "@/lib/utils";
import { FilterSelect, FilterTabs, SearchInput } from "@/components/admin/ui";
import { Card, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { BookingBadge, PaymentBadge } from "@/components/ui/status";

export function BookingsTable({ initialStatus = "all" }) {
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState("all");
  const [zone, setZone] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("date");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return bookings
      .filter((b) => status === "all" || b.status === status)
      .filter((b) => category === "all" || b.category === category)
      .filter((b) => zone === "all" || getSuburb(b.suburb)?.zone === zone)
      .filter((b) => {
        if (!t) return true;
        const c = getCustomer(b.customerId);
        return [b.id, b.suburb, b.address, c.name, c.email, getProvider(b.providerId)?.name ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(t);
      })
      .sort((a, b) =>
        sort === "date"
          ? a.date.localeCompare(b.date)
          : sort === "newest"
            ? b.createdAt.localeCompare(a.createdAt)
            : b.total - a.total,
      );
  }, [status, category, zone, q, sort]);

  const tabs = [
    { value: "all", label: "All", count: bookings.length },
    ...Object.entries(bookingStatus).map(([value, s]) => ({
      value,
      label: s.label,
      count: bookings.filter((b) => b.status === value).length,
    })),
  ];

  return (
    <Card className="overflow-hidden">
      <div className="space-y-3 border-b border-line p-3">
        <FilterTabs options={tabs} value={status} onChange={setStatus} />
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Booking ID, customer, suburb, provider" />
          <FilterSelect label="Service" value={category} onChange={setCategory}>
            <option value="all">All services</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Zone" value={zone} onChange={setZone}>
            <option value="all">All zones</option>
            {zones.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Sort" value={sort} onChange={setSort}>
            <option value="date">Sort: job date</option>
            <option value="newest">Sort: newest booked</option>
            <option value="value">Sort: highest value</option>
          </FilterSelect>
        </div>
      </div>

      {rows.length ? (
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
            {rows.map((b) => {
              const c = getCustomer(b.customerId);
              const p = getProvider(b.providerId);
              return (
                <tr key={b.id} className="hover:bg-paper/60">
                  <Td>
                    <Link href={`/admin/bookings/${b.id}`} className="font-semibold text-ink-900 hover:underline">
                      {b.id}
                    </Link>
                  </Td>
                  <Td>
                    {c.name}
                    <span className="block text-xs text-muted">{b.suburb}</span>
                  </Td>
                  <Td>{getCategory(b.category).name}</Td>
                  <Td>
                    {formatDate(b.date)}
                    <span className="block text-xs text-muted">{b.slot}</span>
                  </Td>
                  <Td>
                    {p ? (
                      p.name
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
              );
            })}
          </tbody>
        </Table>
      ) : (
        <EmptyState
          icon={<CalendarRange />}
          title="No bookings match these filters"
          body="Clear a filter or try a different search."
        />
      )}
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
        <span>
          Showing {rows.length} of {bookings.length}
        </span>
        <div className="flex gap-1">
          <button className="rounded-lg border border-line px-3 py-1 disabled:opacity-40" disabled>
            Previous
          </button>
          <button className="rounded-lg border border-line px-3 py-1 disabled:opacity-40" disabled>
            Next
          </button>
        </div>
      </div>
    </Card>
  );
}
