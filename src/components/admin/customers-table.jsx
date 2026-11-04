// src/components/admin/customers-table.jsx
"use client";

import Link from "next/link";
import { UsersRound } from "lucide-react";
import { cn, formatDate, money } from "@/lib/utils";
import { ContactButtons, FilterSelect, SearchInput } from "@/components/admin/ui";
import { Pager } from "@/components/admin/pager";
import { useDebouncedSearch, useQueryState } from "@/components/admin/use-query-state";
import { Avatar, Badge, Card, EmptyState, Table, Td, Th } from "@/components/ui/misc";

/** Customers list. Search, zone filter, sort and paging run on the server (listCustomers). */
export function CustomersTable({ data, filters, zones }) {
  const { set, pending } = useQueryState();
  const [q, setQ] = useDebouncedSearch(filters.q, (v) => set({ q: v }));

  return (
    <Card className={cn("overflow-hidden transition-opacity", pending && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Name, email, phone, suburb" />
        <FilterSelect label="Zone" value={filters.zone} onChange={(v) => set({ zone: v })}>
          <option value="all">All zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.name}>
              {z.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Sort" value={filters.sort} onChange={(v) => set({ sort: v === "spent" ? "" : v })}>
          <option value="spent">Highest spend</option>
          <option value="bookings">Most bookings</option>
          <option value="joined">Newest</option>
        </FilterSelect>
      </div>
      {data.rows.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Suburb</Th>
              <Th>Bookings</Th>
              <Th>Paid to date</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
              <Th>Contact</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((c) => (
              <tr key={c.id} className="hover:bg-paper/60">
                <Td>
                  <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3">
                    <Avatar name={c.name} size="sm" />
                    <span>
                      <span className="block font-semibold hover:underline">{c.name}</span>
                      <span className="block text-xs text-muted">{c.email}</span>
                    </span>
                  </Link>
                </Td>
                <Td>{c.suburb || <span className="text-muted">—</span>}</Td>
                <Td>{c.bookings}</Td>
                <Td className="font-medium">{money(c.spent)}</Td>
                <Td>{formatDate(c.joined, { day: "numeric", month: "short", year: "numeric" })}</Td>
                <Td>{c.status === "active" ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Blocked</Badge>}</Td>
                <Td>
                  <ContactButtons phone={c.phone} email={c.email} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState icon={<UsersRound />} title="No customers match" />
      )}
      <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: p > 1 ? p : "" })} />
    </Card>
  );
}