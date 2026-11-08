// src/app/(site)/account/layout.jsx
import { AccountNav } from "@/components/site/account-nav";
import { Avatar } from "@/components/ui/misc";
import { UploadsProvider } from "@/components/ui/upload";
import { requireUser } from "@/server/session";
import { uploadsEnabled } from "@/server/uploads";

export const metadata = { title: "My account" };

export default async function AccountLayout({ children }) {
  const user = await requireUser("/account");
  return (
    <div className="container-x grid gap-8 py-8 lg:grid-cols-[240px_1fr] lg:py-12">
      <aside className="min-w-0 space-y-6">
        <div className="hidden items-center gap-3 lg:flex">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <AccountNav />
      </aside>
      <div className="min-w-0">
        <UploadsProvider enabled={uploadsEnabled()}>{children}</UploadsProvider>
      </div>
    </div>
  );
}