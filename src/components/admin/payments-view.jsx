"use client";

import Link from "next/link";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { bookings, getCustomer, getProvider, payouts as seedPayouts } from "@/lib/data";
import { formatDate, money, money2 } from "@/lib/utils";
import { FilterTabs, StatCard } from "@/components/admin/ui";
import { Badge, Card, CardHeader, Table, Td, Th } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/button";
import { Tabs, useToast } from "@/components/ui/interactive";
import { PaymentBadge } from "@/components/ui/status";

export function PaymentsView() {
  const [filter, setFilter] = useState("all");
  const [payouts, setPayouts] = useState(seedPayouts);
  const { toast, toastNode } = useToast();

  const paid = bookings.filter((b) => b.payment === "paid");
  const collected = paid.reduce((s, b) => s + b.total, 0);
  const outstanding = bookings
    .filter((b) => ["unpaid", "partial"].includes(b.payment) && b.status !== "cancelled")
    .reduce((s, b) => s + b.total, 0);
  const owed = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const tx = bookings.filter((b) => filter === "all" || b.payment === filter);

  const transactions = (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-3">
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "paid", label: "Paid" },
            { value: "unpaid", label: "Unpaid" },
            { value: "partial", label: "Deposit" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Booking</Th>
            <Th>Customer</Th>
            <Th>Date</Th>
            <Th>Status</Th>
            <Th className="text-right">Amount</Th>
            <Th className="text-right">GST</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {tx.map((b) => (
            <tr key={b.id}>
              <Td>
                <Link href={`/admin/bookings/${b.id}`} className="font-medium text-ink-900">
                  {b.id}
                </Link>
              </Td>
              <Td>{getCustomer(b.customerId).name}</Td>
              <Td>{formatDate(b.createdAt)}</Td>
              <Td>
                <PaymentBadge status={b.payment} />
              </Td>
              <Td className="text-right font-medium">{money2(b.total)}</Td>
              <Td className="text-right text-muted">{money2(b.total / 11)}</Td>
              <Td className="text-right">
                {b.payment === "unpaid" && (
                  <button className="text-sm font-medium text-ink-900" onClick={() => toast("Payment reminder sent")}>
                    Send reminder
                  </button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );

  const payoutTab = (
    <Card className="overflow-hidden">
      <CardHeader
        title="Provider payouts"
        description="Calculated from completed jobs each week."
        action={
          <Button
            size="sm"
            onClick={() =>
              setPayouts((x) => x.map((p) => ({ ...p, status: "paid" }))) || toast("All pending payouts marked paid")
            }
          >
            Mark all paid
          </Button>
        }
      />
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
                  {getProvider(p.providerId).name}
                </Link>
              </Td>
              <Td>{p.period}</Td>
              <Td>{p.jobs}</Td>
              <Td>{p.status === "paid" ? <Badge tone="success">Paid</Badge> : <Badge tone="brand">Pending</Badge>}</Td>
              <Td className="text-right font-medium">{money(p.amount)}</Td>
              <Td className="text-right">
                {p.status === "pending" && (
                  <button
                    className="text-sm font-medium text-ink-900"
                    onClick={() => setPayouts((x) => x.map((y) => (y.id === p.id ? { ...y, status: "paid" } : y)))}
                  >
                    Mark paid
                  </button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );

  const gateway = (
    <Card className="max-w-2xl p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-800">
          <CreditCard className="size-6" />
        </span>
        <div>
          <p className="font-semibold">No payment gateway connected</p>
          <p className="mt-1 text-sm text-muted">
            Customers can currently choose “Pay after the job”. Connect Stripe, Square or Tyro in Settings to take card payments
            at checkout.
          </p>
          <ButtonLink href="/admin/settings?tab=payments" size="sm" className="mt-4">
            Set up payments
          </ButtonLink>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={money(collected)} hint="shown bookings" />
        <StatCard
          label="Outstanding"
          value={money(outstanding)}
          hint="unpaid or deposit only"
          tone={outstanding ? "alert" : "default"}
        />
        <StatCard label="Owed to providers" value={money(owed)} hint="pending payouts" />
        <StatCard label="GST collected" value={money(collected / 11)} hint="for your BAS" />
      </div>
      <Tabs
        tabs={[
          { id: "tx", label: "Customer payments", content: transactions },
          { id: "payouts", label: "Provider payouts", content: payoutTab },
          { id: "gateway", label: "Gateway", content: gateway },
        ]}
      />
      {toastNode}
    </>
  );
}
