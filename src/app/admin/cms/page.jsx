import { CmsManager } from "@/components/admin/cms-manager";
import { AdminHeader } from "@/components/admin/ui";

export const metadata = { title: "Content" };

export default function CmsPage() {
  return (
    <>
      <AdminHeader title="Content" description="Edit website pages, the homepage, banners, FAQs and blog posts." />
      <CmsManager />
    </>
  );
}
