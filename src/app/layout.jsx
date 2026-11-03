import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { site } from "@/lib/site";
export const metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — Home services in Hobart`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { type: "website", locale: "en_AU", siteName: site.name },
};
export const viewport = { themeColor: "#121a33" };
export default function RootLayout({ children }) {
  return (
    <html lang="en-AU">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
