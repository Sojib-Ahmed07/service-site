import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { bookings, getCategory, getProvider, payouts } from "@/lib/data";
import { formatDate, money } from "@/lib/utils";
import { AdminHeader, ContactButtons, StatCard } from "@/components/admin/ui";
import { ProviderForm } from "@/components/admin/provider-form";
import { Avatar, Badge, Card, CardHeader, Table, Td, Th } from "@/components/ui/misc";
import { BookingBadge, ProviderBadge } from "@/components/ui/status";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: getProvider(id)?.name ?? "Provider" };
}

export default async function ProviderDetailPage({ params }) {
  const { id } = await params;
  const p = getProvider(id);
  if (!p) notFound();
  const jobs = bookings.filter((b) => b.providerId === p.id);
  const pays = payouts.filter((x) => x.providerId === p.id);
  const earned = jobs.reduce((s, b) => s + (b.providerPay ?? 0), 0);

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/providers", label: "Providers" }}
        title={p.name}
        description={`${p.business}. Joined ${formatDate(p.joined, { month: "long", year: "numeric" })}.`}
        actions={<ContactButtons phone={p.phone} email={p.email} size="md" />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Avatar name={p.name} size="lg" />
        <ProviderBadge status={p.status} />
        <span className="flex items-center gap-1 text-sm">
          <Star className="size-4 fill-star text-star" /> {p.rating} from {p.jobs} jobs
        </span>
        {p.notes && <Badge tone="warn">{p.notes}</Badge>}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Upcoming jobs" value={jobs.filter((b) => !["completed", "cancelled"].includes(b.status)).length} />
        <StatCard label="Earned (shown jobs)" value={money(earned)} />
        <StatCard
          label="Pending payout"
          value={money(pays.filter((x) => x.status === "pending").reduce((s, x) => s + x.amount, 0))}
        />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1fr_420px]">
        <ProviderForm provider={p} />
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
                      <span className="block text-xs text-muted">{getCategory(b.category).name}</span>
                    </Td>
                    <Td>{formatDate(b.date)}</Td>
                    <Td>
                      <BookingBadge status={b.status} />
                    </Td>
                    <Td className="text-right">{money(b.providerPay ?? 0)}</Td>
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
              {pays.map((x) => (
                <li key={x.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span>
                    {x.period}
                    <span className="block text-xs text-muted">{x.jobs} jobs</span>
                  </span>
                  <span className="text-right">
                    <span className="font-semibold">{money(x.amount)}</span>
                    <span className="block">
                      <Badge tone={x.status === "paid" ? "success" : "brand"}>{x.status === "paid" ? "Paid" : "Pending"}</Badge>
                    </span>
                  </span>
                </li>
              ))}
              {pays.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No payouts yet.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
