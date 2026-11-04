// src/app/admin/services/new/page.jsx
import { AdminHeader } from "@/components/admin/ui";
import { ServiceEditor } from "@/components/admin/service-editor";

export const metadata = { title: "Add service" };

export default function NewServicePage() {
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/services", label: "Services & pricing" }}
        title="Add service"
        description="New services appear on the website once they have at least one package and are set to bookable."
      />
      <ServiceEditor />
    </>
  );
}