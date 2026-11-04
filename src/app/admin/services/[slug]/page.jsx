// src/app/admin/services/[slug]/page.jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { ServiceEditor } from "@/components/admin/service-editor";
import { getServiceForEdit } from "@/server/queries/admin-catalog";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getServiceForEdit(slug);
  return { title: `Edit ${data?.service.name ?? "service"}` };
}

export default async function EditServicePage({ params }) {
  const { slug } = await params;
  const data = await getServiceForEdit(slug);
  if (!data) notFound();
  const s = data.service;
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/services", label: "Services & pricing" }}
        title={s.name}
        description={s.bookable ? "Bookable on the website." : "Hidden from the website."}
        actions={
          s.bookable && (
            <Link href={`/services/${s.slug}`} target="_blank" className="text-sm font-medium text-ink-900 hover:underline">
              View on website
            </Link>
          )
        }
      />
      <ServiceEditor key={`${s.id}-${s.slug}`} service={s} packages={data.packages} addOns={data.addOns} />
    </>
  );
}