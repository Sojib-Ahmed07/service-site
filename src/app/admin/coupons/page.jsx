// src/app/admin/coupons/page.jsx
import { CouponsManager } from "@/components/admin/coupons-manager";
import { AdminHeader } from "@/components/admin/ui";
import { getAdminOptions } from "@/server/queries/admin";
import { getCouponsAdmin } from "@/server/queries/admin-catalog";

export const metadata = { title: "Promo codes" };

export default async function CouponsPage() {
  const [coupons, options] = await Promise.all([getCouponsAdmin(), getAdminOptions()]);
  return (
    <>
      <AdminHeader
        title="Promo codes"
        description="Discount codes customers enter at checkout. Live codes also appear on the Offers page."
      />
      <CouponsManager coupons={coupons} categories={options.categories.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}