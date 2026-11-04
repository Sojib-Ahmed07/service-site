// src/app/(auth)/register/page.jsx
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/site/auth-forms";
import { authProviders } from "@/server/auth";
import { getCurrentUser, homeFor, safeNext } from "@/server/session";

export const metadata = { title: "Create an account" };

export default async function Page({ searchParams }) {
  const { next = "" } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next, homeFor(user)));
  return <RegisterForm next={safeNext(next, "")} google={authProviders.google} />;
}