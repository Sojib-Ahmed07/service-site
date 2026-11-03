import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { activityLog, bookings, categories, getCategory, getCustomer, getProvider, providers, weeklyRevenue } from "@/lib/data";
import { formatDate, money } from "@/lib/utils";
import { AdminHeader, BarChart, StatCard } from "@/components/admin/ui";
import { Card, CardHeader, Table, Td, Th } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { BookingBadge } from "@/components/ui/status";
import { CategoryIcon } from "@/components/category-icon";

export const metadata = { title: "Dashboard" };

export default function AdminDashboard() {
  const unassigned = bookings.filter((b) => b.status === "new");
  const today = bookings.filter((b) => b.date === "2026-11-03" && b.status !== "cancelled");
  const thisWeek = weeklyRevenue.at(-1);
  const lastWeek = weeklyRevenue.at(-2);
  const revDelta = Math.round(((thisWeek.revenue - lastWeek.revenue) / lastWeek.revenue) * 100);
  const margin = bookings.filter((b) => b.providerPay).reduce((s, b) => s + (b.total - b.providerPay), 0);

  const byCategory = categories
    .map((c) => ({ c, n: bookings.filter((b) => b.category === c.slug).length }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const maxCat = byCategory[0]?.n ?? 1;
  const compliance = providers.filter((p) => !p.docs.insurance || !p.docs.policeCheck);

  return (
    <>
      <AdminHeader
        title="Good morning, Rachel"
        description="Tuesday 3 November. Here’s what needs your attention."
        actions={
          <>
            <ButtonLink href="/admin/bookings?status=new" variant="outline" size="sm">
              Assign jobs
            </ButtonLink>
            <ButtonLink href="/admin/bookings/new" size="sm">
              New booking
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Needs assigning"
          value={unassigned.length}
          hint="bookings waiting for a pro"
          tone={unassigned.length ? "alert" : "default"}
        />
        <StatCard label="Jobs today" value={today.length} hint="across Greater Hobart" />
        <StatCard label="Revenue this week" value={money(thisWeek.revenue)} delta={revDelta} hint="vs last week" />
        <StatCard label="Gross margin (open jobs)" value={money(margin)} hint="after provider pay" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            title="Waiting for a provider"
            description="Assign these first. Oldest bookings at the top."
            action={
              <Link href="/admin/bookings?status=new" className="text-sm font-medium text-ink-900">
                View all
              </Link>
            }
          />
          {unassigned.length ? (
            <div className="divide-y divide-line">
              {unassigned.map((b) => {
                const c = getCategory(b.category);
                return (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper/70"
                  >
                    <CategoryIcon icon={c.icon} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {c.name} <span className="font-normal text-muted">in {b.suburb}</span>
                      </p>
                      <p className="text-sm text-muted">
                        {formatDate(b.date)}, {b.slot}, for {getCustomer(b.customerId).name}
                      </p>
                    </div>
                    <span className="hidden text-sm font-semibold sm:block">{money(b.total)}</span>
                    <span className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white">Assign</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">Every booking has a provider. Nice work.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Weekly revenue" description="Last 8 weeks, GST incl." />
          <div className="p-5">
            <BarChart data={weeklyRevenue} valueKey="revenue" labelKey="week" format={(v) => money(v)} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Today’s schedule" />
          <Table>
            <thead>
              <tr>
                <Th>Booking</Th>
                <Th>Service</Th>
                <Th>Window</Th>
                <Th>Provider</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {today.map((b) => (
                <tr key={b.id} className="hover:bg-paper/60">
                  <Td>
                    <Link href={`/admin/bookings/${b.id}`} className="font-medium text-ink-900">
                      {b.id}
                    </Link>
                  </Td>
                  <Td>
                    {getCategory(b.category).name}
                    <span className="block text-xs text-muted">{b.suburb}</span>
                  </Td>
                  <Td>{b.slot}</Td>
                  <Td>{getProvider(b.providerId)?.name ?? <span className="text-muted">Unassigned</span>}</Td>
                  <Td>
                    <BookingBadge status={b.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Top services" description="By number of bookings" />
            <ul className="space-y-3 p-5">
              {byCategory.map(({ c, n }) => (
                <li key={c.slug}>
                  <div className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="text-muted">{n}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-paper">
                    <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(n / maxCat) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {compliance.length > 0 && (
            <Card className="border-brand-400">
              <CardHeader title="Compliance alerts" />
              <ul className="divide-y divide-line">
                {compliance.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/providers/${p.id}`}
                      className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-paper/60"
                    >
                      <AlertTriangle className="size-4 text-warn" />
                      <span className="flex-1">
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-muted">
                          {!p.docs.insurance ? "Insurance certificate missing" : "Police check missing"}
                        </span>
                      </span>
                      <ChevronRight className="size-4 text-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent activity" />
        <ul className="divide-y divide-line">
          {activityLog.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>{a.what}</span>
              <span className="text-muted">
                {a.who}, {formatDate(a.when, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
