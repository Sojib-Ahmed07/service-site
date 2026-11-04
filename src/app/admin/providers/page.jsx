// src/app/admin/providers/page.jsx
import { ProvidersTable } from "@/components/admin/providers-table";
import { AdminHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { getAdminOptions, getProvidersFull } from "@/server/queries/admin";

export const metadata = { title: "Providers" };

export default async function ProvidersPage({ searchParams }) {
  const { skill = "all" } = await searchParams;
  const [providers, options] = await Promise.all([getProvidersFull(), getAdminOptions()]);
  return (
    <>
      <AdminHeader
        title="Providers"
        description="Your cleaners, technicians and tradespeople. Filter by service and area to find who can take a job."
        actions={
          <ButtonLink href="/admin/providers/new" size="sm">
            Add provider
          </ButtonLink>
        }
      />
      <ProvidersTable
        providers={providers}
        categories={options.categories}
        zones={options.zones}
        initialSkill={options.categories.some((c) => c.slug === skill) ? skill : "all"}
      />
    </>
  );
}