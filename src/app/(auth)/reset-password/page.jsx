// src/app/(auth)/reset-password/page.jsx
/** The emailed reset link lands here as /reset-password?token=… (or ?error=INVALID_TOKEN). */
import { ResetForm } from "@/components/site/auth-forms";

export const metadata = { title: "Choose a new password" };

export default async function Page({ searchParams }) {
    const { token = "", error = "" } = await searchParams;
    return <ResetForm token={String(token)} invalid={Boolean(error)} />;
}