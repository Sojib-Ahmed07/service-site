// src/app/(site)/account/profile/page.jsx
import { ProfileForms } from "@/components/site/profile-forms";
import { requireUser } from "@/server/session";

export const metadata = { title: "Profile & security" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  return <ProfileForms user={user} />;
}