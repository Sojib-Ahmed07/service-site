import Link from "next/link";
import { notFound } from "next/navigation";
import { addOnsFor, getCategory, packagesFor } from "@/lib/data";
import { AdminHeader } from "@/components/admin/ui";
import { ServiceEditor } from "@/components/admin/service-editor";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: `Edit ${getCategory(slug)?.name ?? "service"}` };
}

export default async function EditServicePage({ params }) {
  const { slug } = await params;
  const s = getCategory(slug);
  if (!s) notFound();
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/services", label: "Services & pricing" }}
        title={s.name}
        actions={
          <Link href={`/services/${s.slug}`} target="_blank" className="text-sm font-medium text-ink-900 hover:underline">
            View on website
          </Link>
        }
      />
      <ServiceEditor service={s} packages={packagesFor(slug)} addOns={addOnsFor(slug)} />
    </>
  );
}
