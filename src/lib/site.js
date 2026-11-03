/**
 * Brand + business settings. Change the name here and it updates everywhere.
 * In production these come from Admin › Settings (site_settings table).
 */
export const site = {
  name: "Sorted",
  tagline: "Home services, sorted.",
  description:
    "Book cleaning, pest control, gardening, handyman and trade services at fixed prices. Vetted local pros, one team looking after every job.",
  city: "Hobart",
  region: "Greater Hobart",
  phone: "(03) 6111 0000",
  phoneHref: "tel:+61361110000",
  email: "hello@sorted.com.au",
  address: "Level 2, 39 Murray Street, Hobart TAS 7000",
  abn: "00 000 000 000",
  hours: "Mon–Sat, 7am–7pm",
  timezone: "Australia/Hobart",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  social: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
  },
};
