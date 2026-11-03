import { PaymentsView } from "@/components/admin/payments-view";
import { AdminHeader } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Payments & payouts" };

export default function PaymentsPage() {
  return (
    <>
      <AdminHeader
        title="Payments & payouts"
        description="Money in from customers, money out to providers."
        actions={
          <ButtonLink href="#" variant="outline" size="sm">
            Export for Xero
          </ButtonLink>
        }
      />
      <PaymentsView />
    </>
  );
}
