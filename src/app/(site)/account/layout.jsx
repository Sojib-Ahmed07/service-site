import { AccountNav } from "@/components/site/account-nav";
import { Avatar } from "@/components/ui/misc";
import { demoUser } from "@/lib/data";

export const metadata = { title: "My account" };

export default function AccountLayout({ children }) {
  return (
    <div className="container-x grid gap-8 py-8 lg:grid-cols-[240px_1fr] lg:py-12">
      <aside className="space-y-6">
        <div className="hidden items-center gap-3 lg:flex">
          <Avatar name={demoUser.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{demoUser.name}</p>
            <p className="truncate text-sm text-muted">{demoUser.email}</p>
          </div>
        </div>
        <AccountNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
