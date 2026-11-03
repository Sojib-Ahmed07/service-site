"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { UsersRound } from "lucide-react";
import { customers, zones, getSuburb } from "@/lib/data";
import { formatDate, money } from "@/lib/utils";
import { ContactButtons, FilterSelect, SearchInput } from "@/components/admin/ui";
import { Avatar, Badge, Card, EmptyState, Table, Td, Th } from "@/components/ui/misc";

export function CustomersTable() {
  const [q, setQ] = useState("");
  const [zone, setZone] = useState("all");
  const [sort, setSort] = useState("spent");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return customers
      .filter((c) => !t || `${c.name} ${c.email} ${c.phone} ${c.suburb}`.toLowerCase().includes(t))
      .filter((c) => zone === "all" || getSuburb(c.suburb)?.zone === zone)
      .sort((a, b) =>
        sort === "spent" ? b.spent - a.spent : sort === "bookings" ? b.bookings - a.bookings : b.joined.localeCompare(a.joined),
      );
  }, [q, zone, sort]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Name, email, phone, suburb" />
        <FilterSelect label="Zone" value={zone} onChange={setZone}>
          <option value="all">All zones</option>
          {zones.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Sort" value={sort} onChange={setSort}>
          <option value="spent">Highest spend</option>
          <option value="bookings">Most bookings</option>
          <option value="joined">Newest</option>
        </FilterSelect>
      </div>
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Suburb</Th>
              <Th>Bookings</Th>
              <Th>Lifetime spend</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
              <Th>Contact</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
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
                <Td>{c.suburb}</Td>
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
    </Card>
  );
}
