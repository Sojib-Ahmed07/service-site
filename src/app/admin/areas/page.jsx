// src/app/admin/areas/page.jsx
import { AdminHeader } from "@/components/admin/ui";
import { AreasManager } from "@/components/admin/areas-manager";
import { getAreasAdmin } from "@/server/queries/admin-catalog";

export const metadata = { title: "Service areas" };

export default async function AreasAdminPage() {
  const zones = await getAreasAdmin();
  return (
    <>
      <AdminHeader
        title="Service areas"
        description="Zones group suburbs for provider matching. Set a travel fee per suburb, or switch a suburb off to stop bookings there."
      />
      <AreasManager zones={zones} />
    </>
  );
}