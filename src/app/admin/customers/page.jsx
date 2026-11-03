import { CustomersTable } from "@/components/admin/customers-table";
import { AdminHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <>
      <AdminHeader
        title="Customers"
        description="Everyone who has booked or created an account."
        actions={
          <ButtonLink href="#" variant="outline" size="sm">
            Export CSV
          </ButtonLink>
        }
      />
      <CustomersTable />
    </>
  );
}
