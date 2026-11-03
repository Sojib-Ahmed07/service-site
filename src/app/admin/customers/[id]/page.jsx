import Link from "next/link";
import { notFound } from "next/navigation";
import { bookings, getCategory, getCustomer, getProvider } from "@/lib/data";
import { formatDate, money } from "@/lib/utils";
import { AdminHeader, ContactButtons, StatCard } from "@/components/admin/ui";
import { Badge, Card, CardHeader, Table, Td, Th } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { BookingBadge, PaymentBadge } from "@/components/ui/status";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: getCustomer(id)?.name ?? "Customer" };
}

export default async function CustomerDetailPage({ params }) {
  const { id } = await params;
  const c = getCustomer(id);
  if (!c) notFound();
  const list = bookings.filter((b) => b.customerId === c.id);

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        title={c.name}
        description={`Customer since ${formatDate(c.joined, { month: "long", year: "numeric" })}, ${c.suburb}`}
        actions={
          <>
            <ContactButtons phone={c.phone} email={c.email} size="md" />
            <ButtonLink href="/admin/bookings/new" size="sm" className="h-10">
              Book for customer
            </ButtonLink>
          </>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Bookings" value={c.bookings} />
        <StatCard label="Lifetime spend" value={money(c.spent)} />
        <StatCard label="Average booking" value={money(c.bookings ? c.spent / c.bookings : 0)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
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
              {list.map((b) => (
                <tr key={b.id}>
                  <Td>
                    <Link href={`/admin/bookings/${b.id}`} className="font-medium text-ink-900">
                      {b.id}
                    </Link>
                  </Td>
                  <Td>{getCategory(b.category).name}</Td>
                  <Td>{formatDate(b.date)}</Td>
                  <Td>{getProvider(b.providerId)?.name ?? "—"}</Td>
                  <Td>
                    <BookingBadge status={b.status} />
                  </Td>
                  <Td>
                    <PaymentBadge status={b.payment} />
                  </Td>
                  <Td className="text-right">{money(b.total)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Details"
              action={c.status === "active" ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Blocked</Badge>}
            />
            <form className="space-y-4 p-5">
              <Field label="Name">
                <Input defaultValue={c.name} />
              </Field>
              <Field label="Email">
                <Input defaultValue={c.email} />
              </Field>
              <Field label="Mobile">
                <Input defaultValue={c.phone} />
              </Field>
              <Field label="Internal notes">
                <Textarea placeholder="e.g. Prefers morning bookings" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm">
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost">
                  Send password reset
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-danger">
                  {c.status === "active" ? "Block customer" : "Unblock"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
