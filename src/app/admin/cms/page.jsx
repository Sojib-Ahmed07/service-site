// src/app/admin/cms/page.jsx
import { CmsManager } from "@/components/admin/cms-manager";
import { AdminHeader } from "@/components/admin/ui";
import { getBannersAdmin, getFaqsAdmin, listPagesAdmin, listPostsAdmin } from "@/server/queries/admin-content";
import { getHomepage, getImages } from "@/server/queries/settings";

export const metadata = { title: "Content" };

const tabs = ["pages", "home", "banners", "faqs", "blog"];

export default async function CmsPage({ searchParams }) {
  const { tab } = await searchParams;
  const [pages, posts, banners, faqs, homepage, images] = await Promise.all([
    listPagesAdmin(),
    listPostsAdmin(),
    getBannersAdmin(),
    getFaqsAdmin(),
    getHomepage(),
    getImages(),
  ]);
  return (
    <>
      <AdminHeader title="Content" description="Edit website pages, the homepage, banners, FAQs and blog posts." />
      <CmsManager
        defaultTab={tabs.includes(tab) ? tab : "pages"}
        pages={pages}
        posts={posts}
        banners={banners}
        faqs={faqs}
        homepage={homepage}
        images={images}
      />
    </>
  );
}