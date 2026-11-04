// src/app/layout.jsx
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { site as defaults } from "@/lib/site";
import { getBusiness } from "@/server/queries/settings";

/** Site name and description come from Admin › Settings (falls back to defaults if the DB is unreachable). */
export async function generateMetadata() {
  let site = defaults;
  try {
    site = await getBusiness();
  } catch (err) {
    console.error("[metadata] using default business details:", err.message);
  }
  return {
    metadataBase: new URL(defaults.url),
    title: { default: `${site.name} — Home services in ${site.city}`, template: `%s · ${site.name}` },
    description: site.description,
    openGraph: { type: "website", locale: "en_AU", siteName: site.name },
  };
}
export const viewport = { themeColor: "#121a33" };
export default function RootLayout({ children }) {
  return (
    <html lang="en-AU">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}