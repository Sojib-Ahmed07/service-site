import { LegalPage } from "@/components/site/legal";
import { site } from "@/lib/site";

export const metadata = { title: "Privacy policy" };

const sections = [
  {
    id: "collect",
    title: "What we collect",
    body: [
      "Your name, contact details, service address, access notes, booking history and payment records. We don’t store full card numbers; our payment provider does.",
    ],
  },
  {
    id: "use",
    title: "How we use it",
    body: [
      "To arrange and complete your bookings, send updates and receipts, handle complaints and improve our service. We only send marketing if you opt in.",
    ],
  },
  {
    id: "share",
    title: "Who we share it with",
    body: [
      "The professional assigned to your job receives only what they need: first name, address, booking details and access notes. We never sell your information.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    body: [
      `You can access, correct or delete your information at any time from your account or by emailing ${site.email}. We handle personal information in line with the Privacy Act 1988 (Cth).`,
    ],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" updated="1 July 2026" sections={sections} />;
}
