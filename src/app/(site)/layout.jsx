// src/app/(site)/layout.jsx
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getCategories } from "@/server/queries/catalog";
import { getBanner } from "@/server/queries/content";
import { getBusiness } from "@/server/queries/settings";
import { getCurrentUser } from "@/server/session";

// Pages read live data from the database on every request.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }) {
  const [categories, top, business, user] = await Promise.all([
    getCategories(),
    getBanner("Top bar"),
    getBusiness(),
    getCurrentUser(),
  ]);
  return (
    <>
      <SiteHeader
        announcement={top ?? undefined}
        categories={categories}
        business={business}
        user={user ? { name: user.name, role: user.role } : null}
      />
      <main>{children}</main>
      <SiteFooter categories={categories} business={business} />
    </>
  );
}