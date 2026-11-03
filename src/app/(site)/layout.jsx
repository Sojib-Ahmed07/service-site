import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { banners } from "@/lib/data";
export default function SiteLayout({ children }) {
  const top = banners.find((b) => b.active && b.placement === "Top bar");
  return (
    <>
      <SiteHeader announcement={top ? { text: top.text, link: top.link } : undefined} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
