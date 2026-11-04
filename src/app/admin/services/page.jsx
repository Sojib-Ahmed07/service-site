// src/app/admin/services/page.jsx
import Link from "next/link";
import { Star } from "lucide-react";
import { money } from "@/lib/utils";
import { serviceGroups } from "@/lib/constants";
import { AdminHeader } from "@/components/admin/ui";
import { ActionSwitch } from "@/components/admin/bookable-switch";
import { CategoryIcon } from "@/components/category-icon";
import { Badge, Card, Table, Td, Th } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { setServiceBookable } from "@/server/actions/admin-catalog";
import { getServicesOverview } from "@/server/queries/admin-catalog";

export const metadata = { title: "Services & pricing" };

export default async function AdminServicesPage() {
  const services = await getServicesOverview();
  const groups = serviceGroups.filter((g) => services.some((s) => s.group === g));
  return (
    <>
      <AdminHeader
        title="Services & pricing"
        description="What customers can book. Edit packages, prices, extras and the text shown on each service page."
        actions={
          <ButtonLink href="/admin/services/new" size="sm">
            Add service
          </ButtonLink>
        }
      />
      {services.length === 0 && <Card className="p-8 text-center text-muted">No services yet. Add your first one.</Card>}
      <div className="space-y-6">
        {groups.map((g) => (
          <Card key={g} className="overflow-hidden">
            <div className="border-b border-line px-5 py-3">
              <h2 className="font-sans text-[15px] font-semibold tracking-normal">{g}</h2>
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th>Packages</Th>
                  <Th>Extras</Th>
                  <Th>From</Th>
                  <Th>Providers</Th>
                  <Th>Bookings</Th>
                  <Th>Rating</Th>
                  <Th>Bookable</Th>
                </tr>
              </thead>
              <tbody>
                {services
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-paper/60">
                      <Td>
                        <Link href={`/admin/services/${c.slug}`} className="flex items-center gap-3">
                          <CategoryIcon icon={c.icon} size="sm" />
                          <span className="font-semibold hover:underline">{c.name}</span>
                          {c.featured && <Badge tone="brand">Featured</Badge>}
                        </Link>
                      </Td>
                      <Td className={c.packages ? "" : "font-medium text-warn"}>{c.packages}</Td>
                      <Td>{c.extras}</Td>
                      <Td>
                        {c.fromPrice === null ? (
                          "—"
                        ) : (
                          <>
                            {money(c.fromPrice)}
                            {c.priceUnit}
                          </>
                        )}
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/providers?skill=${c.slug}`}
                          className={c.providers < 2 ? "font-medium text-warn hover:underline" : "hover:underline"}
                        >
                          {c.providers} active
                        </Link>
                      </Td>
                      <Td>{c.bookings}</Td>
                      <Td>
                        {c.rating === null ? (
                          <span className="text-muted">No reviews</span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Star className="size-3.5 fill-star text-star" /> {c.rating} ({c.reviews})
                          </span>
                        )}
                      </Td>
                      <Td>
                        <ActionSwitch
                          id={c.id}
                          initial={c.bookable}
                          action={setServiceBookable}
                          label={`${c.name} bookable`}
                          onMessage={`${c.name} is bookable`}
                          offMessage={`${c.name} hidden from the website`}
                        />
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </Card>
        ))}
      </div>
    </>
  );
}