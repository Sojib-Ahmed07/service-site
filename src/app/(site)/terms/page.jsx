import { LegalPage } from "@/components/site/legal";
import { site } from "@/lib/site";

export const metadata = { title: "Terms of service" };

const sections = [
  {
    id: "about",
    title: "Who we are",
    body: [
      `${site.name} (ABN ${site.abn}) arranges home services in Greater Hobart. Services are performed by independent professionals we engage on your behalf. Your contract for the booking is with ${site.name}.`,
    ],
  },
  {
    id: "bookings",
    title: "Bookings and prices",
    body: [
      "Prices shown include GST. The price you see at checkout is the price you pay unless the job differs materially from what was booked, in which case we’ll contact you to approve any change before work continues.",
      "Arrival windows are estimates. We’ll let you know if your professional is running late.",
    ],
  },
  {
    id: "cancellations",
    title: "Changes and cancellations",
    body: [
      "You can reschedule or cancel free of charge up to 24 hours before your arrival window.",
      "Inside 24 hours, a late-change fee of up to 50% of the booking may apply. If our professional can’t access the property at the booked time, the full booking may be charged.",
    ],
  },
  {
    id: "payment",
    title: "Payment",
    body: [
      "Card payments are authorised at booking and captured after completion. Invoices for pay-later bookings are due within 7 days.",
    ],
  },
  {
    id: "guarantee",
    title: "Our guarantee",
    body: [
      "If you report a problem within 48 hours (72 hours for end of lease cleans), we’ll send someone back to fix it free or refund the affected part of the job.",
    ],
  },
  {
    id: "consumer-law",
    title: "Australian Consumer Law",
    body: ["Nothing in these terms limits your rights under the Australian Consumer Law."],
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of service" updated="1 July 2026" sections={sections} />;
}
