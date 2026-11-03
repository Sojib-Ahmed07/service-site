import { SettingsView } from "@/components/admin/settings-view";
import { AdminHeader } from "@/components/admin/ui";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }) {
  const { tab = "business" } = await searchParams;
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Settings" description="Business details, booking rules, notifications, payments and team." />
      <SettingsView defaultTab={tab} />
    </div>
  );
}
