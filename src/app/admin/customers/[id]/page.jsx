// src/app/admin/customers/[id]/page.jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatISODate } from "@/lib/dates";
import { formatDate, money } from "@/lib/utils";
import { AdminHeader, ContactButtons, StatCard } from "@/components/admin/ui";
import { CustomerDetails } from "@/components/admin/customer-details";
import { Card, CardHeader, Table, Td, Th } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { BookingBadge, PaymentBadge } from "@/components/ui/status";
import { getAdminCustomer } from "@/server/queries/admin";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const c = await getAdminCustomer(id);
  return { title: c?.name ?? "Customer" };
}

export default async function CustomerDetailPage({ params }) {
  const { id } = await params;
  const c = await getAdminCustomer(id);
  if (!c) notFound();
  const paidCount = c.bookings.filter((b) => b.payment === "paid").length;

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={c.name}
        description={`Customer since ${formatDate(c.joined, { month: "long", year: "numeric" })}${c.suburb ? `, ${c.suburb}` : ""}`}
        actions={
          !c.deleted && (
            <>
              <ContactButtons phone={c.phone} email={c.email} size="md" />
              {c.status === "active" && (
                <ButtonLink href={`/admin/bookings/new?customer=${encodeURIComponent(c.id)}`} size="sm" className="h-10">
                  Book for customer
                </ButtonLink>
              )}
            </>
          )
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Bookings" value={c.bookings.length} />
        <StatCard label="Paid to date" value={money(c.spent)} />
        <StatCard label="Average paid booking" value={money(paidCount ? c.spent / paidCount : 0)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <CardHeader title="Booking history" />
          <Table>
            <thead>
              <tr>
                <Th>Booking</Th>
                <Th>Service</Th>
                <Th>Date</Th>
                <Th>Provider</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {c.bookings.map((b) => (
                <tr key={b.id}>
                  <Td>
                    <Link href={`/admin/bookings/${b.id}`} className="font-medium text-ink-900">
                      {b.id}
                    </Link>
                  </Td>
                  <Td>{b.categoryName}</Td>
                  <Td>{formatISODate(b.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</Td>
                  <Td>{b.providerName ?? "—"}</Td>
                  <Td>
                    <BookingBadge status={b.status} />
                  </Td>
                  <Td>
                    <PaymentBadge status={b.payment} />
                  </Td>
                  <Td className="text-right">{money(b.total)}</Td>
                </tr>
              ))}
              {c.bookings.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-muted">
                    No bookings yet.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
        <div className="space-y-6">
          {c.deleted ? (
            <Card className="p-5 text-sm text-muted">
              This customer deleted their account. Their bookings are kept for tax records.
            </Card>
          ) : (
            <CustomerDetails customer={c} />
          )}
        </div>
      </div>
    </>
  );
}