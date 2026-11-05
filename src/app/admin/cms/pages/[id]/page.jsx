// src/app/admin/cms/pages/[id]/page.jsx
/**
 * Page and blog post editor.
 *   /admin/cms/pages/new              new page
 *   /admin/cms/pages/12               page 12
 *   /admin/cms/pages/about            built-in page that hasn't been saved yet
 *   /admin/cms/pages/new?type=post    new blog post
 *   /admin/cms/pages/7?type=post      post 7
 */
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { ContentEditor } from "@/components/admin/content-editor";
import { getPageForEdit, getPostCategories, getPostForEdit } from "@/server/queries/admin-content";
import { getCategories } from "@/server/queries/catalog";
import { getOfferSettings } from "@/server/queries/settings";

export const metadata = { title: "Edit content" };

export default async function EditContentPage({ params, searchParams }) {
  const { id } = await params;
  const { type } = await searchParams;
  const isPost = type === "post";
  const key = String(id).toLowerCase();

  if (isPost) {
    const [doc, categories] = await Promise.all([getPostForEdit(key), getPostCategories()]);
    if (!doc) notFound();
    return (
      <>
        <AdminHeader
          back={{ href: "/admin/cms?tab=blog", label: "Content" }}
          title={doc.id ? "Edit post" : "New post"}
          description={doc.title || undefined}
        />
        <ContentEditor key={doc.id ?? "new"} doc={doc} isPost categories={categories} />
      </>
    );
  }

  const doc = await getPageForEdit(key);
  if (!doc) notFound();
  const isOffers = doc.slug === "/offers";
  const [services, offers] = isOffers ? await Promise.all([getCategories(), getOfferSettings()]) : [[], null];
  return (
    <>
      <AdminHeader
        back={{ href: "/admin/cms", label: "Content" }}
        title={doc.id || doc.builtIn ? "Edit page" : "New page"}
        description={doc.title || undefined}
      />
      <ContentEditor
        key={doc.id ?? doc.slug ?? "new"}
        doc={doc}
        isPost={false}
        services={services.map((c) => ({ slug: c.slug, name: c.name }))}
        offers={
          offers
            ? { seasonal: offers.seasonal ?? [], seasonalTitle: offers.seasonalTitle ?? "", seasonalText: offers.seasonalText ?? "" }
            : null
        }
      />
    </>
  );
}