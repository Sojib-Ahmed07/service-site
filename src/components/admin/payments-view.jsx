// src/components/admin/payments-view.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { createPayouts, sendPaymentReminder, setPayoutStatus } from "@/server/actions/admin-catalog";
import { addDaysISO, formatISODate, todayISO, weekdayIndex } from "@/lib/dates";
import { cn, formatDate, money, money2 } from "@/lib/utils";
import { FilterTabs, StatCard } from "@/components/admin/ui";
import { Pager } from "@/components/admin/pager";
import { useQueryState } from "@/components/admin/use-query-state";
import { Badge, Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal, Tabs, useToast } from "@/components/ui/interactive";
import { PaymentBadge } from "@/components/ui/status";

const short = (iso) => formatISODate(iso, { day: "numeric", month: "short" });
/** The most recent Sunday (end of last full week), in Hobart. */
function lastSunday() {
  const t = todayISO();
  const dow = weekdayIndex(t);
  return addDaysISO(t, dow === 0 ? -7 : -dow);
}

export function PaymentsView({ overview, payments, paymentFilter, payouts, initialTab = "tx" }) {
  const router = useRouter();
  const { set, pending: navPending } = useQueryState();
  const { toast, toastNode } = useToast();
  const [pending, start] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [upTo, setUpTo] = useState(lastSunday());
  const [error, setError] = useState("");

  const run = (fn, success, after) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        toast(res.error);
        return;
      }
      setError("");
      after?.();
      toast(res.message ?? success);
      router.refresh();
    });

  const transactions = (
    <Card className={cn("overflow-hidden transition-opacity", navPending && "opacity-60")}>
      <div className="border-b border-line p-3">
        <FilterTabs
          value={paymentFilter}
          onChange={(v) => set({ payment: v, tab: "" })}
          options={[
            { value: "all", label: "All" },
            { value: "paid", label: "Paid" },
            { value: "unpaid", label: "Unpaid" },
            { value: "partial", label: "Deposit" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
      </div>
      {payments.rows.length ? (
        <Table>
          <thead>
            <tr>
              <Th>Booking</Th>
              <Th>Customer</Th>
              <Th>Job date</Th>
              <Th>Status</Th>
              <Th className="text-right">Amount</Th>
              <Th className="text-right">GST</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {payments.rows.map((b) => (
              <tr key={b.id}>
                <Td>
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium text-ink-900">
                    {b.id}
                  </Link>
                  {b.status === "cancelled" && <span className="block text-xs text-muted">Cancelled</span>}
                </Td>
                <Td>{b.customerName}</Td>
                <Td>{formatISODate(b.date, { day: "numeric", month: "short", year: "numeric" })}</Td>
                <Td>
                  <PaymentBadge status={b.payment} />
                </Td>
                <Td className="text-right font-medium">{money2(b.total)}</Td>
                <Td className="text-right text-muted">{money2(b.total / 11)}</Td>
                <Td className="text-right">
                  {["unpaid", "partial"].includes(b.payment) && b.status !== "cancelled" && (
                    <button
                      className="text-sm font-medium text-ink-900 hover:underline disabled:opacity-50"
                      disabled={pending}
                      onClick={() => run(() => sendPaymentReminder(b.id), "Payment reminder sent")}
                    >
                      Send reminder
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title="No bookings here" />
      )}
      <Pager
        page={payments.page}
        pages={payments.pages}
        total={payments.total}
        onPage={(p) => set({ page: p > 1 ? p : "" }, { keepPage: true })}
      />
    </Card>
  );

  const pendingCount = payouts.filter((p) => p.status === "pending").length;
  const payoutTab = (
    <div className="space-y-4">
      {overview.unbatchedJobs > 0 && (
        <Card className="flex flex-col gap-3 border-brand-400 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-semibold">
              {overview.unbatchedJobs} completed job{overview.unbatchedJobs === 1 ? "" : "s"}
            </span>{" "}
            ({money(overview.unbatched)} provider pay) not yet in a payout.
          </p>
          <Button size="sm" onClick={() => setError("") || setCreateOpen(true)}>
            Create payouts
          </Button>
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardHeader
          title="Provider payouts"
          description="Created from completed jobs. Pay providers by bank transfer, then mark them paid."
          action={
            pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => setPayoutStatus("all-pending", "paid"), "Marked paid")}
              >
                Mark all paid ({pendingCount})
              </Button>
            )
          }
        />
        {payouts.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Provider</Th>
                <Th>Period</Th>
                <Th>Jobs</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <Link href={`/admin/providers/${p.providerId}`} className="font-medium hover:underline">
                      {p.providerName}
                    </Link>
                    {!p.hasBank && p.status !== "paid" && <span className="block text-xs text-warn">No bank details</span>}
                  </Td>
                  <Td>
                    {short(p.periodStart)} – {short(p.periodEnd)}
                  </Td>
                  <Td>{p.jobs}</Td>
                  <Td>
                    {p.status === "paid" ? (
                      <Badge tone="success">
                        Paid {p.paidAt ? formatDate(p.paidAt, { day: "numeric", month: "short" }) : ""}
                      </Badge>
                    ) : p.status === "held" ? (
                      <Badge tone="warn">Held</Badge>
                    ) : (
                      <Badge tone="brand">Pending</Badge>
                    )}
                  </Td>
                  <Td className="text-right font-medium">{money2(p.amount)}</Td>
                  <Td className="whitespace-nowrap text-right">
                    {p.status !== "paid" && (
                      <button
                        className="text-sm font-medium text-ink-900 hover:underline"
                        disabled={pending}
                        onClick={() => run(() => setPayoutStatus(p.id, "paid"), "Marked paid")}
                      >
                        Mark paid
                      </button>
                    )}
                    {p.status === "pending" && (
                      <button
                        className="ml-3 text-sm text-muted hover:text-ink"
                        disabled={pending}
                        onClick={() => run(() => setPayoutStatus(p.id, "held"), "Payout held")}
                      >
                        Hold
                      </button>
                    )}
                    {p.status !== "pending" && (
                      <button
                        className="ml-3 text-sm text-muted hover:text-ink"
                        disabled={pending}
                        onClick={() => run(() => setPayoutStatus(p.id, "pending"), "Moved back to pending")}
                      >
                        Undo
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="No payouts yet" body="Complete some jobs, then create payouts here." />
        )}
      </Card>
    </div>
  );

  const gateway = (
    <Card className="max-w-2xl p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800">
          <CreditCard className="size-6" />
        </span>
        <div>
          <p className="font-semibold">Card payments aren’t connected yet</p>
          <p className="mt-1 text-sm text-muted">
            Customers book with “Pay after the job”. Record money you receive (cash, bank transfer, card terminal) from each
            booking with “Record payment”. Online card payments will be added once a provider is chosen.
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={money(overview.collected)} hint="all paid bookings" />
        <StatCard
          label="Outstanding"
          value={money(overview.outstanding)}
          hint={`${overview.outstandingCount} unpaid or deposit only`}
          tone={overview.outstanding ? "alert" : "default"}
        />
        <StatCard
          label="Owed to providers"
          value={money(overview.owed + overview.unbatched)}
          hint="pending payouts + unbatched jobs"
        />
        <StatCard label="GST collected" value={money(overview.collected / 11)} hint="on paid bookings, for your BAS" />
      </div>
      <Tabs
        defaultTab={initialTab}
        tabs={[
          { id: "tx", label: "Customer payments", content: transactions },
          { id: "payouts", label: `Provider payouts${pendingCount ? ` (${pendingCount})` : ""}`, content: payoutTab },
          { id: "gateway", label: "Card payments", content: gateway },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create payouts"
        description="Adds up completed jobs (with provider pay set) that aren’t in a payout yet, one payout per provider."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !upTo}
              onClick={() =>
                run(
                  () => createPayouts(upTo),
                  "Payouts created",
                  () => setCreateOpen(false),
                )
              }
            >
              {pending ? "Creating…" : "Create payouts"}
            </Button>
          </>
        }
      >
        <Field label="Include jobs done up to and including" htmlFor="po-upto" hint="Usually last Sunday.">
          <Input id="po-upto" type="date" value={upTo} max={todayISO()} onChange={(e) => setUpTo(e.target.value)} />
        </Field>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Modal>
      {toastNode}
    </>
  );
}