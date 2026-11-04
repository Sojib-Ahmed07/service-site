// src/app/(auth)/login/page.jsx
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/site/auth-forms";
import { authProviders } from "@/server/auth";
import { getCurrentUser, homeFor, safeNext } from "@/server/session";
import { getBusiness } from "@/server/queries/settings";

export const metadata = { title: "Log in" };

export default async function Page({ searchParams }) {
  const { next = "", reset = "", error = "" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next, homeFor(user)));
  const business = await getBusiness();
  const notice =
    reset === "done"
      ? "Password updated. Log in with your new password."
      : error === "google"
        ? "Google sign-in didn’t complete. Please try again."
        : "";
  return <LoginForm next={safeNext(next, "")} google={authProviders.google} notice={notice} businessName={business.name} />;
}