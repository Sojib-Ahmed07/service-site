// src/components/site/auth-forms.jsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CircleCheck, Eye, EyeOff, MailCheck } from "lucide-react";
import { requestPasswordReset, resetPassword, signIn, signUp, startGoogleSignIn } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { useServerForm } from "@/components/ui/use-server-form";

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

/** Shown only when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set. */
function GoogleButton({ next, children }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startGoogleSignIn(next);
            if (res.ok) window.location.href = res.url;
            else setError(res.error);
          })
        }
        className="flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-line-strong bg-surface font-semibold hover:bg-paper disabled:opacity-60"
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
        {pending ? "Connecting…" : children}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 text-sm text-muted">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function FormError({ result }) {
  return result?.error ? (
    <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger">
      {result.error}
    </p>
  ) : null;
}

export function LoginForm({ next = "", google = false, notice = "", businessName = "Sorted" }) {
  const { pending, result, onSubmit, errors } = useServerForm(signIn);
  return (
    <>
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-muted">Log in to manage your bookings.</p>
      {notice && (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-3 text-sm">
          <CircleCheck className="size-4 shrink-0 text-success" /> {notice}
        </p>
      )}
      {google && (
        <>
          <div className="mt-8">
            <GoogleButton next={next}>Continue with Google</GoogleButton>
          </div>
          <Divider />
        </>
      )}
      <form className={google ? "space-y-5" : "mt-8 space-y-5"} onSubmit={onSubmit}>
        <input type="hidden" name="next" value={next} />
        <FormError result={result} />
        <Field label="Email" htmlFor="l-email" error={errors.email}>
          <Input id="l-email" name="email" type="email" required autoComplete="email" maxLength={255} />
        </Field>
        <Field
          label="Password"
          htmlFor="l-pass"
          error={errors.password}
          hint={
            <Link href="/forgot-password" className="font-medium text-ink-900">
              Forgot your password?
            </Link>
          }
        >
          <PasswordInput id="l-pass" name="password" required autoComplete="current-password" maxLength={128} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to {businessName}?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-ink-900">
          Create an account
        </Link>
      </p>
    </>
  );
}

export function RegisterForm({ next = "", google = false }) {
  const { pending, result, onSubmit, errors } = useServerForm(signUp);
  return (
    <>
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <p className="mt-2 text-muted">Book faster, track jobs and download invoices.</p>
      {google && (
        <>
          <div className="mt-8">
            <GoogleButton next={next}>Sign up with Google</GoogleButton>
          </div>
          <Divider />
        </>
      )}
      <form className={google ? "grid gap-5 sm:grid-cols-2" : "mt-8 grid gap-5 sm:grid-cols-2"} onSubmit={onSubmit}>
        <input type="hidden" name="next" value={next} />
        <div className="sm:col-span-2 empty:hidden">
          <FormError result={result} />
        </div>
        <Field label="Full name" htmlFor="r-name" className="sm:col-span-2" error={errors.name}>
          <Input id="r-name" name="name" required autoComplete="name" maxLength={120} />
        </Field>
        <Field label="Email" htmlFor="r-email" error={errors.email}>
          <Input id="r-email" name="email" type="email" required autoComplete="email" maxLength={255} />
        </Field>
        <Field label="Mobile" htmlFor="r-phone" error={errors.phone}>
          <Input id="r-phone" name="phone" type="tel" required autoComplete="tel" maxLength={32} />
        </Field>
        <Field label="Password" htmlFor="r-pass" hint="At least 8 characters." className="sm:col-span-2" error={errors.password}>
          <PasswordInput id="r-pass" name="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        </Field>
        <Checkbox className="sm:col-span-2" name="marketingOptIn" label="Send me seasonal reminders and offers (optional)" />
        <Button type="submit" size="lg" className="w-full sm:col-span-2" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-ink-900">
          Log in
        </Link>
      </p>
    </>
  );
}

export function ForgotForm() {
  const { pending, result, onSubmit, errors } = useServerForm(requestPasswordReset);
  if (result?.ok)
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-12 text-brand-600" />
        <h1 className="mt-4 text-3xl font-semibold">Check your email</h1>
        <p className="mt-2 text-muted">
          If an account exists for that address, we’ve sent a link to reset your password. It expires in 1 hour.
        </p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-ink-900">
          Back to log in
        </Link>
      </div>
    );
  return (
    <>
      <h1 className="text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-muted">
        Enter your email and we’ll send you a reset link. Booked as a guest? This is also how you set a password.
      </p>
      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <Field label="Email" htmlFor="f-email" error={errors.email}>
          <Input id="f-email" name="email" type="email" required autoComplete="email" maxLength={255} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
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

export function ResetForm({ token = "", invalid = false }) {
  const { pending, result, onSubmit, errors } = useServerForm(resetPassword);
  if (invalid || !token)
    return (
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Link expired</h1>
        <p className="mt-2 text-muted">This reset link has expired or was already used.</p>
        <Link href="/forgot-password" className="mt-6 inline-block font-semibold text-ink-900">
          Request a new link
        </Link>
      </div>
    );
  return (
    <>
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-muted">You’ll be logged out of other devices.</p>
      <form className="mt-8 space-y-5" onSubmit={onSubmit}>
        <input type="hidden" name="token" value={token} />
        <FormError result={result} />
        <Field label="New password" htmlFor="n-pass" hint="At least 8 characters." error={errors.password}>
          <PasswordInput id="n-pass" name="password" required minLength={8} maxLength={128} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" htmlFor="n-confirm" error={errors.confirm}>
          <PasswordInput id="n-confirm" name="confirm" required minLength={8} maxLength={128} autoComplete="new-password" />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </>
  );
}