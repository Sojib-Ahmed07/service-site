// src/app/admin/settings/page.jsx
import { SettingsView } from "@/components/admin/settings-view";
import { AdminHeader } from "@/components/admin/ui";
import { emailStatus } from "@/server/email";
import { getTeam } from "@/server/queries/admin-content";
import { getBookingRules, getBusiness, getNotificationSettings, getPaymentSettings } from "@/server/queries/settings";
import { requireAdmin } from "@/server/session";

export const metadata = { title: "Settings" };

const tabs = ["business", "booking", "notifications", "payments", "team"];

export default async function SettingsPage({ searchParams }) {
  const { tab } = await searchParams;
  const [me, business, booking, notifications, payments, team] = await Promise.all([
    requireAdmin(),
    getBusiness(),
    getBookingRules(),
    getNotificationSettings(),
    getPaymentSettings(),
    getTeam(),
  ]);
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Settings" description="Business details, booking rules, notifications, payments and team." />
      <SettingsView
        defaultTab={tabs.includes(tab) ? tab : "business"}
        business={business}
        booking={booking}
        notifications={notifications}
        payments={payments}
        team={team}
        me={{ id: me.id, email: me.email, teamRole: me.teamRole }}
        email={emailStatus()}
        cronReady={(process.env.CRON_SECRET?.trim().length ?? 0) >= 16}
      />
    </div>
  );
}