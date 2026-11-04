// src/app/admin/providers/new/page.jsx
import { ProviderForm } from "@/components/admin/provider-form";
import { AdminHeader } from "@/components/admin/ui";
import { getAdminOptions } from "@/server/queries/admin";

export const metadata = { title: "Add provider" };

export default async function NewProviderPage() {
  const options = await getAdminOptions();
  return (
    <div className="max-w-4xl">
      <AdminHeader
        back={{ href: "/admin/providers", label: "Providers" }}
        title="Add provider"
        description="Add someone you’ve vetted. They won’t get a login — you’ll contact them by phone, SMS or email."
      />
      <ProviderForm categories={options.categories} zones={options.zones} />
    </div>
  );
}