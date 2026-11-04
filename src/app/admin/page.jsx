// src/app/admin/page.jsx
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { formatISODate } from "@/lib/dates";
import { formatDate, money } from "@/lib/utils";
import { AdminHeader, BarChart, StatCard } from "@/components/admin/ui";
import { Card, CardHeader, Table, Td, Th } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { BookingBadge } from "@/components/ui/status";
import { CategoryIcon } from "@/components/category-icon";
import { getDashboard } from "@/server/queries/admin";
import { getBusiness } from "@/server/queries/settings";
import { requireAdmin } from "@/server/session";

export const metadata = { title: "Dashboard" };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", { hour: "numeric", hourCycle: "h23", timeZone: "Australia/Hobart" }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function AdminDashboard() {
  const [admin, d, business] = await Promise.all([requireAdmin(), getDashboard(), getBusiness()]);
  const maxCat = d.top[0]?.n ?? 1;

  return (
    <>
      <AdminHeader
        title={`${greeting()}, ${admin.name.split(" ")[0]}`}
        description={`${formatISODate(d.today)}. Here’s what needs your attention.`}
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
          value={d.unassigned.length === 8 ? "8+" : d.unassigned.length}
          hint="bookings waiting for a pro"
          tone={d.unassigned.length ? "alert" : "default"}
        />
        <StatCard label="Jobs today" value={d.todays.length} hint={`across ${business.region}`} />
        <StatCard
          label="Revenue this week"
          value={money(d.thisWeekRevenue)}
          delta={d.revDelta ?? undefined}
          hint={d.revDelta === null ? "jobs this week, GST incl." : "vs last week"}
        />
        <StatCard label="Gross margin (open jobs)" value={money(d.margin)} hint="after provider pay" />
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
          {d.unassigned.length ? (
            <div className="divide-y divide-line">
              {d.unassigned.map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/bookings/${b.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper/70"
                >
                  <CategoryIcon icon={b.icon} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {b.categoryName} <span className="font-normal text-muted">in {b.suburb}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {formatISODate(b.date, { weekday: "short", day: "numeric", month: "short" })}, {b.slot}, for{" "}
                      {b.customerName}
                    </p>
                  </div>
                  <span className="hidden text-sm font-semibold sm:block">{money(b.total)}</span>
                  <span className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white">Assign</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">Every booking has a provider. Nice work.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Weekly revenue" description="Jobs by week, last 8 weeks, GST incl. (excludes cancelled)" />
          <div className="p-5">
            <BarChart data={d.weekly} valueKey="revenue" labelKey="week" format={(v) => money(v)} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader title="Today’s schedule" />
          {d.todays.length ? (
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
                {d.todays.map((b) => (
                  <tr key={b.id} className="hover:bg-paper/60">
                    <Td>
                      <Link href={`/admin/bookings/${b.id}`} className="font-medium text-ink-900">
                        {b.id}
                      </Link>
                    </Td>
                    <Td>
                      {b.categoryName}
                      <span className="block text-xs text-muted">{b.suburb}</span>
                    </Td>
                    <Td>{b.slot}</Td>
                    <Td>{b.providerName ?? <span className="text-muted">Unassigned</span>}</Td>
                    <Td>
                      <BookingBadge status={b.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">No jobs booked for today.</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Top services" description="By number of bookings" />
            {d.top.length ? (
              <ul className="space-y-3 p-5">
                {d.top.map((c) => (
                  <li key={c.slug}>
                    <div className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="text-muted">{c.n}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-paper">
                      <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(c.n / maxCat) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted">No bookings yet.</p>
            )}
          </Card>

          {d.compliance.length > 0 && (
            <Card className="border-brand-400">
              <CardHeader title="Compliance alerts" />
              <ul className="divide-y divide-line">
                {d.compliance.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/providers/${p.id}`}
                      className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-paper/60"
                    >
                      <AlertTriangle className="size-4 shrink-0 text-warn" />
                      <span className="flex-1">
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-muted">{p.issue}</span>
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
        {d.activity.length ? (
          <ul className="divide-y divide-line">
            {d.activity.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>{a.what}</span>
                <span className="text-muted">
                  {a.who}, {formatDate(a.when, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">Nothing yet.</p>
        )}
      </Card>
    </>
  );
}