import Link from "next/link";
import { Star } from "lucide-react";
import { addOnsFor, bookings, categories, packagesFor, providers } from "@/lib/data";
import { money } from "@/lib/utils";
import { AdminHeader } from "@/components/admin/ui";
import { CategoryIcon } from "@/components/category-icon";
import { Badge, Card, Table, Td, Th } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { Switch } from "@/components/ui/interactive";

export const metadata = { title: "Services & pricing" };

export default function AdminServicesPage() {
  const groups = [...new Set(categories.map((c) => c.group))];
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
                {categories
                  .filter((c) => c.group === g)
                  .map((c) => {
                    const pros = providers.filter((p) => p.skills.includes(c.slug) && p.status === "active").length;
                    return (
                      <tr key={c.slug} className="hover:bg-paper/60">
                        <Td>
                          <Link href={`/admin/services/${c.slug}`} className="flex items-center gap-3">
                            <CategoryIcon icon={c.icon} size="sm" />
                            <span className="font-semibold hover:underline">{c.name}</span>
                            {c.popular && <Badge tone="brand">Featured</Badge>}
                          </Link>
                        </Td>
                        <Td>{packagesFor(c.slug).length}</Td>
                        <Td>{addOnsFor(c.slug).length}</Td>
                        <Td>
                          {money(c.fromPrice)}
                          {c.priceUnit}
                        </Td>
                        <Td>
                          <Link
                            href={`/admin/providers?skill=${c.slug}`}
                            className={pros < 2 ? "font-medium text-warn hover:underline" : "hover:underline"}
                          >
                            {pros} active
                          </Link>
                        </Td>
                        <Td>{bookings.filter((b) => b.category === c.slug).length}</Td>
                        <Td>
                          <span className="flex items-center gap-1">
                            <Star className="size-3.5 fill-star text-star" /> {c.rating}
                          </span>
                        </Td>
                        <Td>
                          <Switch defaultChecked label={`${c.name} bookable`} />
                        </Td>
                      </tr>
                    );
                  })}
              </tbody>
            </Table>
          </Card>
        ))}
      </div>
    </>
  );
}
