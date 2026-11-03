import { blogPosts, cmsPages } from "@/lib/data";
import { AdminHeader } from "@/components/admin/ui";
import { ContentEditor } from "@/components/admin/content-editor";

export const metadata = { title: "Edit content" };

export default async function EditContentPage({ params, searchParams }) {
  const { id } = await params;
  const { type } = await searchParams;
  const isPost = type === "post";
  const doc = id === "new" ? null : isPost ? blogPosts.find((p) => p.slug === id) : cmsPages.find((p) => p.id === id);

  return (
    <>
      <AdminHeader
        back={{ href: "/admin/cms", label: "Content" }}
        title={doc ? `Edit ${isPost ? "post" : "page"}` : `New ${isPost ? "post" : "page"}`}
        description={doc?.title}
      />
      <ContentEditor doc={doc} isPost={isPost} />
    </>
  );
}
