// src/app/admin/inbox/page.jsx
import { AdminInbox } from "@/components/admin/inbox";
import { AdminHeader } from "@/components/admin/ui";
import { getAdminOptions, getInbox } from "@/server/queries/admin";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const [{ enquiries, applications }, options] = await Promise.all([getInbox(), getAdminOptions()]);
  const categoryNames = Object.fromEntries(options.categories.map((c) => [c.slug, c.name]));
  return (
    <>
      <AdminHeader title="Inbox" description="Contact form messages, quote requests and provider applications." />
      <AdminInbox enquiries={enquiries} applications={applications} categoryNames={categoryNames} />
    </>
  );
}