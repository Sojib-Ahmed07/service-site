import { ProviderForm } from "@/components/admin/provider-form";
import { AdminHeader } from "@/components/admin/ui";

export const metadata = { title: "Add provider" };

export default function NewProviderPage() {
  return (
    <div className="max-w-4xl">
      <AdminHeader
        back={{ href: "/admin/providers", label: "Providers" }}
        title="Add provider"
        description="Add someone you’ve vetted. They won’t get a login — you’ll contact them by phone, SMS or email."
      />
      <ProviderForm />
    </div>
  );
}
