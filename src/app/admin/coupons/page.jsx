import { CouponsManager } from "@/components/admin/coupons-manager";
import { AdminHeader } from "@/components/admin/ui";

export const metadata = { title: "Promo codes" };

export default function CouponsPage() {
  return (
    <>
      <AdminHeader title="Promo codes" description="Discount codes customers enter at checkout." />
      <CouponsManager />
    </>
  );
}
