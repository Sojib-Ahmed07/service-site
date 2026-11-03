"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";

/**
 * UI only. Wire these to Better Auth or Auth.js (credentials + Google).
 * After sign-in, send role "admin" to /admin and role "customer" to /account.
 */
function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function GoogleButton({ children }) {
  return (
    <button
      type="button"
      className="flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-line-strong bg-surface font-semibold hover:bg-paper"
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-7.9z" />
        <path
          fill="#34A853"
          d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z"
        />
        <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
      </svg>
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 text-sm text-muted">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  return (
    <>
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-muted">Log in to manage your bookings.</p>
      <div className="mt-8">
        <GoogleButton>Continue with Google</GoogleButton>
      </div>
      <Divider />
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          // Demo routing: any email containing "admin" opens the admin panel.
          router.push(email.includes("admin") ? "/admin" : "/account");
        }}
      >
        <Field label="Email" htmlFor="l-email">
          <Input
            id="l-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="l-pass"
          hint={
            <Link href="/forgot-password" className="font-medium text-ink-900">
              Forgot your password?
            </Link>
          }
        >
          <PasswordInput id="l-pass" required autoComplete="current-password" />
        </Field>
        <Button type="submit" size="lg" className="w-full">
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to Sorted?{" "}
        <Link href="/register" className="font-semibold text-ink-900">
          Create an account
        </Link>
      </p>
      <p className="mt-8 rounded-xl bg-paper p-3 text-center text-xs text-muted ring-1 ring-line">
        Demo: use an email containing “admin” to open the admin panel.
      </p>
    </>
  );
}

export function RegisterForm() {
  const router = useRouter();
  return (
    <>
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <p className="mt-2 text-muted">Book faster, track jobs and download invoices.</p>
      <div className="mt-8">
        <GoogleButton>Sign up with Google</GoogleButton>
      </div>
      <Divider />
      <form
        className="grid gap-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/account");
        }}
      >
        <Field label="Full name" htmlFor="r-name" className="sm:col-span-2">
          <Input id="r-name" required autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="r-email">
          <Input id="r-email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Mobile" htmlFor="r-phone">
          <Input id="r-phone" type="tel" required autoComplete="tel" />
        </Field>
        <Field label="Password" htmlFor="r-pass" hint="At least 8 characters." className="sm:col-span-2">
          <PasswordInput id="r-pass" required minLength={8} autoComplete="new-password" />
        </Field>
        <Checkbox className="sm:col-span-2" label="Send me seasonal reminders and offers (optional)" />
        <Button type="submit" size="lg" className="w-full sm:col-span-2">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink-900">
          Log in
        </Link>
      </p>
    </>
  );
}

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-12 text-brand-600" />
        <h1 className="mt-4 text-3xl font-semibold">Check your email</h1>
        <p className="mt-2 text-muted">If an account exists for that address, we’ve sent a link to reset your password.</p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-ink-900">
          Back to log in
        </Link>
      </div>
    );
  return (
    <>
      <h1 className="text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-muted">Enter your email and we’ll send you a reset link.</p>
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true);
        }}
      >
        <Field label="Email" htmlFor="f-email">
          <Input id="f-email" type="email" required autoComplete="email" />
        </Field>
        <Button type="submit" size="lg" className="w-full">
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-ink-900">
          Back to log in
        </Link>
      </p>
    </>
  );
}
