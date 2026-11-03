import { ProvidersTable } from "@/components/admin/providers-table";
import { AdminHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Providers" };

export default async function ProvidersPage({ searchParams }) {
  const { skill = "all" } = await searchParams;
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
      <ProvidersTable initialSkill={skill} />
    </>
  );
}
