// src/app/admin/providers/[id]/page.jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { formatISODate } from "@/lib/dates";
import { formatDate, money } from "@/lib/utils";
import { AdminHeader, ContactButtons, StatCard } from "@/components/admin/ui";
import { ProviderForm } from "@/components/admin/provider-form";
import { Avatar, Badge, Card, CardHeader, Table, Td, Th } from "@/components/ui/misc";
import { BookingBadge, ProviderBadge } from "@/components/ui/status";
import { getAdminOptions, getProviderActivity, getProviderById } from "@/server/queries/admin";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: (await getProviderById(id))?.name ?? "Provider" };
}

const short = (iso) => formatISODate(iso, { day: "numeric", month: "short" });

export default async function ProviderDetailPage({ params }) {
  const { id } = await params;
  const p = await getProviderById(id);
  if (!p) notFound();
  const [{ jobs, payouts }, options] = await Promise.all([getProviderActivity(p.id), getAdminOptions()]);
  const upcoming = jobs.filter((b) => !["completed", "cancelled"].includes(b.status));
  const earned = jobs.filter((b) => b.status === "completed").reduce((s, b) => s + b.providerPay, 0);
  const pendingPayout = payouts.filter((x) => x.status === "pending").reduce((s, x) => s + x.amount, 0);

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/providers", label: "Providers" }}
        title={p.name}
        description={`${p.business ? `${p.business}. ` : ""}Added ${formatDate(p.joined, { month: "long", year: "numeric" })}.`}
        actions={<ContactButtons phone={p.phone} email={p.email} size="md" />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Avatar name={p.name} size="lg" />
        <ProviderBadge status={p.status} />
        <span className="flex items-center gap-1 text-sm">
          <Star className="size-4 fill-star text-star" /> {p.rating.toFixed(1)}, {p.jobs} completed job{p.jobs === 1 ? "" : "s"}
        </span>
        {!p.compliant && <Badge tone="warn">Missing: {p.missing.join(", ")}</Badge>}
        {p.expiring.length > 0 && <Badge tone="warn">Document expiring within 30 days</Badge>}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Upcoming jobs" value={upcoming.length} />
        <StatCard label="Earned (completed jobs)" value={money(earned)} />
        <StatCard label="Pending payout" value={money(pendingPayout)} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <ProviderForm key={p.id} provider={p} categories={options.categories} zones={options.zones} />
        <div className="space-y-6">
          <Card>
            <CardHeader title="Jobs" />
            <Table>
              <thead>
                <tr>
                  <Th>Booking</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Pay</Th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((b) => (
                  <tr key={b.id}>
                    <Td>
                      <Link href={`/admin/bookings/${b.id}`} className="font-medium text-ink-900">
                        {b.id}
                      </Link>
                      <span className="block text-xs text-muted">{b.categoryName}</span>
                    </Td>
                    <Td>{formatISODate(b.date, { weekday: "short", day: "numeric", month: "short" })}</Td>
                    <Td>
                      <BookingBadge status={b.status} />
                    </Td>
                    <Td className="text-right">{money(b.providerPay)}</Td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <Td colSpan={4} className="py-8 text-center text-muted">
                      No jobs assigned yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Payouts" />
            <ul className="divide-y divide-line">
              {payouts.map((x) => (
                <li key={x.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>
                    {short(x.periodStart)} – {short(x.periodEnd)}
                    <span className="block text-xs text-muted">{x.jobs} jobs</span>
                  </span>
                  <span className="text-right">
                    <span className="font-semibold">{money(x.amount)}</span>
                    <span className="block">
                      <Badge tone={x.status === "paid" ? "success" : x.status === "held" ? "warn" : "brand"}>
                        {x.status === "paid" ? "Paid" : x.status === "held" ? "Held" : "Pending"}
                      </Badge>
                    </span>
                  </span>
                </li>
              ))}
              {payouts.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No payouts yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}