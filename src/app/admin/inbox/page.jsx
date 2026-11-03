import { AdminInbox } from "@/components/admin/inbox";
import { AdminHeader } from "@/components/admin/ui";

export const metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <>
      <AdminHeader title="Inbox" description="Contact form messages, quote requests and provider applications." />
      <AdminInbox />
    </>
  );
}
