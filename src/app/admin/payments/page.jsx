// src/app/admin/payments/page.jsx
import { PaymentsView } from "@/components/admin/payments-view";
import { AdminHeader } from "@/components/admin/ui";
import { getPaymentsOverview, getPayoutsAdmin, listPaymentRows } from "@/server/queries/admin-catalog";

export const metadata = { title: "Payments & payouts" };

const filters = ["all", "paid", "unpaid", "partial", "refunded"];

export default async function PaymentsPage({ searchParams }) {
  const sp = await searchParams;
  const payment = filters.includes(sp.payment) ? sp.payment : "all";
  const [overview, payments, payouts] = await Promise.all([
    getPaymentsOverview(),
    listPaymentRows({ payment, page: Number(sp.page) || 1 }),
    getPayoutsAdmin(),
  ]);
  return (
    <>
      <AdminHeader
        title="Payments & payouts"
        description="Money in from customers, money out to providers."
        actions={
          <a
            href="/admin/payments/export"
            className="inline-flex h-9 items-center rounded-[10px] border border-line-strong bg-surface px-3.5 text-sm font-semibold hover:bg-paper"
          >
            Export for Xero (CSV)
          </a>
        }
      />
      <PaymentsView
        overview={overview}
        payments={payments}
        paymentFilter={payment}
        payouts={payouts}
        initialTab={sp.tab === "payouts" ? "payouts" : "tx"}
      />
    </>
  );
}