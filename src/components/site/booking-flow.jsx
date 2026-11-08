// src/components/site/booking-flow.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Banknote, Check, CreditCard, Lock, MapPin, Tag } from "lucide-react";
import { addDaysISO, formatISODate, todayISO, weekdayIndex } from "@/lib/dates";
import { cn, money, money2 } from "@/lib/utils";
import { applyCoupon, getSlotAvailability } from "@/server/actions/checkout";
import { createBooking } from "@/server/actions/bookings";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";

const steps = ["Address", "Date & time", "Your details", "Payment"];

/**
 * Four-step checkout. Services, prices, suburbs, time slots and booking rules come
 * from the database. Promo codes, slot availability and the final booking are all
 * checked again on the server (createBooking). `user` and `savedAddresses` are set
 * when the customer is signed in.
 */
export function BookingFlow({
  category,
  packages,
  addOns,
  suburbs,
  rules,
  initialPackageId,
  initialAddOns,
  initialSuburb,
  user = null,
  savedAddresses = [],
  loginHref = "/login",
}) {
  const router = useRouter();
  const timeSlots = rules.timeSlots ?? [];
  // Start from the default saved address, unless the visitor picked a different suburb.
  const defaultAddress =
    savedAddresses.find((a) => a.isDefault && (!initialSuburb || a.suburb === initialSuburb)) ??
    (initialSuburb ? savedAddresses.find((a) => a.suburb === initialSuburb) : null);
  const [addressId, setAddressId] = useState(defaultAddress ? String(defaultAddress.id) : "");
  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState("");
  const [step, setStep] = useState(0);
  const [pkgId, setPkgId] = useState(initialPackageId);
  const [extras, setExtras] = useState(initialAddOns);
  const [form, setForm] = useState({
    suburb: defaultAddress?.suburb ?? (suburbs.some((s) => s.name === initialSuburb) ? initialSuburb : ""),
    street: defaultAddress ? [defaultAddress.line1, defaultAddress.line2].filter(Boolean).join(", ") : "",
    access: defaultAddress?.notes ?? "",
    date: "",
    slot: "",
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    createAccount: true,
    payment: "later",
    coupon: "",
    agree: false,
  });
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, startCouponCheck] = useTransition();
  const [days, setDays] = useState([]);
  const [slots, setSlots] = useState({ date: "", list: [], error: "", loading: false });

  useEffect(() => {
    // Built on the client so "today" is current; dates are Hobart calendar days (YYYY-MM-DD).
    const today = todayISO();
    const first = Math.ceil((Number(rules.minNoticeHours) || 0) / 24);
    const last = Math.max(first, Number(rules.windowDays) || 14);
    const out = [];
    for (let i = first; i <= last; i++) out.push(addDaysISO(today, i));
    setDays(out);
  }, [rules.minNoticeHours, rules.windowDays]);

  // Load which arrival windows are still open whenever the date changes.
  useEffect(() => {
    if (!form.date) return;
    let cancelled = false;
    setSlots({ date: form.date, list: [], error: "", loading: true });
    getSlotAvailability(form.date)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) return setSlots({ date: form.date, list: [], error: res.error, loading: false });
        setSlots({ date: form.date, list: res.slots, error: "", loading: false });
        // Clear a chosen slot that has just filled up.
        setForm((f) => (f.slot && res.slots.some((x) => x.slot === f.slot && x.full) ? { ...f, slot: "" } : f));
      })
      .catch(
        () => !cancelled && setSlots({ date: form.date, list: [], error: "Couldn’t load times. Try again.", loading: false }),
      );
    return () => {
      cancelled = true;
    };
  }, [form.date]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pkg = packages.find((p) => p.id === pkgId);
  const chosenExtras = addOns.filter((a) => extras.includes(a.id));
  const suburbInfo = suburbs.find((s) => s.name === form.suburb);
  const travel = suburbInfo?.surcharge ?? 0;
  const subtotal = pkg.price + chosenExtras.reduce((s, a) => s + a.price, 0) + travel;
  // The code stays applied only while the selection still meets its minimum spend.
  const couponValid = Boolean(couponApplied) && subtotal >= couponApplied.minSpend;
  const discount = couponValid
    ? Math.min(
      subtotal,
      couponApplied.type === "percent" ? Math.round(subtotal * couponApplied.value) / 100 : couponApplied.value,
    )
    : 0;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  const canContinue = [
    form.suburb && form.street.trim().length > 3,
    form.date && form.slot,
    form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length >= 8,
    form.agree,
  ][step];

  const onApplyCoupon = () => {
    const code = form.coupon.trim();
    if (!code) return setCouponError("Enter a promo code.");
    startCouponCheck(async () => {
      const res = await applyCoupon({
        categorySlug: category.slug,
        packageId: pkgId,
        addOnIds: extras,
        suburb: form.suburb,
        couponCode: code,
      });
      if (!res.ok) {
        setCouponApplied(null);
        setCouponError(res.error);
        return;
      }
      setCouponError("");
      setCouponApplied(res.coupon);
    });
  };

  const chooseAddress = (id) => {
    setAddressId(id);
    const a = savedAddresses.find((x) => String(x.id) === id);
    setForm((f) =>
      a
        ? { ...f, suburb: a.suburb, street: [a.line1, a.line2].filter(Boolean).join(", "), access: a.notes ?? "" }
        : { ...f, street: "", access: "" },
    );
  };

  const confirm = () => {
    if (submitting) return;
    setSubmitError("");
    startSubmit(async () => {
      try {
        const res = await createBooking({
          categorySlug: category.slug,
          packageId: pkgId,
          addOnIds: extras,
          suburb: form.suburb,
          street: form.street,
          access: form.access,
          date: form.date,
          slot: form.slot,
          name: form.name,
          email: form.email,
          phone: form.phone,
          createAccount: Boolean(form.createAccount),
          payment: form.payment,
          couponCode: couponValid ? couponApplied.code : "",
          agree: form.agree,
        });
        if (!res.ok) {
          setSubmitError(res.error);
          if (typeof res.step === "number" && res.step < 3) {
            setStep(res.step);
            if (res.step === 1) setForm((f) => ({ ...f, slot: "", date: "" }));
          }
          return;
        }
        const qs = new URLSearchParams({ ref: res.reference, service: res.service, date: res.date, slot: res.slot });
        if (res.accountEmailSent) qs.set("account", "1");
        router.push(`/book/success?${qs.toString()}`);
      } catch {
        setSubmitError("We couldn’t place your booking. Please check your connection and try again.");
      }
    });
  };

  return (
    <div className="container-x grid gap-10 py-8 lg:grid-cols-[1fr_380px] lg:py-12">
      <div className="min-w-0">
        <Link
          href={`/services/${category.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to {category.name.toLowerCase()}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Book {category.name.toLowerCase()}</h1>

        {/* Stepper: a real sequence, so it is numbered */}
        <ol className="mt-8 grid grid-cols-4 gap-2">
          {steps.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                className="group flex w-full flex-col gap-2 text-left disabled:cursor-default"
              >
                <span className={cn("h-1.5 rounded-full", i <= step ? "bg-brand-600" : "bg-line")} />
                <span className={cn("text-xs font-medium sm:text-sm", i === step ? "text-ink" : "text-muted")}>
                  <span className="hidden sm:inline">{i + 1}. </span>
                  {s}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-8">
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {savedAddresses.length > 0 && (
                <Field label="Saved addresses" htmlFor="saved" className="sm:col-span-2">
                  <Select id="saved" value={addressId} onChange={(e) => chooseAddress(e.target.value)}>
                    {savedAddresses.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.label}: {a.line}
                      </option>
                    ))}
                    <option value="">Use a different address</option>
                  </Select>
                </Field>
              )}
              <Field
                label="Suburb"
                htmlFor="suburb"
                hint={travel ? `A ${money(travel)} travel fee applies to ${form.suburb}.` : "Greater Hobart only."}
              >
                <Select
                  id="suburb"
                  value={form.suburb}
                  onChange={(e) => {
                    set("suburb", e.target.value);
                    setAddressId("");
                  }}
                >
                  <option value="">Select your suburb</option>
                  {suburbs.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} {s.postcode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Street address" htmlFor="street">
                <Input
                  id="street"
                  value={form.street}
                  onChange={(e) => {
                    set("street", e.target.value);
                    setAddressId("");
                  }}
                  placeholder="e.g. 14 Pirie Street"
                  autoComplete="street-address"
                  maxLength={200}
                />
              </Field>
              <Field
                label="Access notes"
                htmlFor="access"
                hint="Lockbox codes, parking, pets. Only shared with the assigned pro."
                className="sm:col-span-2"
              >
                <Textarea
                  id="access"
                  value={form.access}
                  onChange={(e) => set("access", e.target.value)}
                  placeholder="e.g. Key in lockbox by the side gate, code 1234. Friendly dog."
                  maxLength={1000}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="font-semibold">Choose a day</p>
              <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                {days.length === 0 && <div className="h-20 w-full animate-pulse rounded-2xl bg-paper" />}
                {days.map((iso) => {
                  const closed = !rules.sundays && weekdayIndex(iso) === 0;
                  const active = form.date === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={closed}
                      onClick={() => setForm((f) => (f.date === iso ? f : { ...f, date: iso, slot: "" }))}
                      className={cn(
                        "flex w-[72px] shrink-0 flex-col items-center rounded-2xl border-2 py-3 transition-colors disabled:opacity-40",
                        active ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-surface hover:border-line-strong",
                      )}
                    >
                      <span className={cn("text-xs", active ? "text-ink-100" : "text-muted")}>
                        {formatISODate(iso, { weekday: "short" })}
                      </span>
                      <span className="font-display text-2xl font-semibold">{Number(iso.slice(8, 10))}</span>
                      <span className={cn("text-xs", active ? "text-ink-100" : "text-muted")}>
                        {formatISODate(iso, { month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!rules.sundays && <p className="mt-2 text-xs text-muted">We don’t book on Sundays.</p>}

              <p className="mt-8 font-semibold">Arrival window</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {timeSlots.map((s) => {
                  const ready = form.date && slots.date === form.date && !slots.loading && !slots.error;
                  const full = ready && slots.list.some((x) => x.slot === s && x.full);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!ready || full}
                      onClick={() => set("slot", s)}
                      className={cn(
                        "rounded-xl border-2 px-4 py-3 text-left text-[15px] font-medium transition-colors disabled:opacity-40",
                        form.slot === s ? "border-ink-900 bg-ink-50" : "border-line hover:border-line-strong",
                      )}
                    >
                      {s}
                      {full && <span className="block text-xs font-normal text-muted">Fully booked</span>}
                    </button>
                  );
                })}
              </div>
              {!form.date && <p className="mt-3 text-sm text-muted">Pick a day to see times.</p>}
              {form.date && slots.loading && <p className="mt-3 text-sm text-muted">Checking availability…</p>}
              {form.date && slots.error && <p className="mt-3 text-sm text-danger">{slots.error}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              {user ? (
                <p className="text-sm text-muted sm:col-span-2">
                  Booking as <span className="font-medium text-ink">{user.name}</span> ({user.email}).
                </p>
              ) : (
                <p className="text-sm text-muted sm:col-span-2">
                  Already have an account?{" "}
                  <Link href={loginHref} className="font-medium text-ink-900 underline underline-offset-4">
                    Log in
                  </Link>{" "}
                  to use your saved details.
                </p>
              )}
              <Field label="Full name" htmlFor="name" className="sm:col-span-2">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  autoComplete="name"
                  maxLength={120}
                  disabled={Boolean(user)}
                />
              </Field>
              <Field label="Email" htmlFor="email" hint="We’ll send your confirmation here.">
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  autoComplete="email"
                  maxLength={255}
                  disabled={Boolean(user)}
                />
              </Field>
              <Field label="Mobile" htmlFor="phone" hint="So our team can reach you on the day.">
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="04xx xxx xxx"
                  autoComplete="tel"
                  maxLength={32}
                />
              </Field>
              {!user && (
                <Checkbox
                  className="sm:col-span-2"
                  checked={form.createAccount}
                  onChange={(e) => set("createAccount", e.target.checked)}
                  label="Create an account so I can manage and rebook this job (we’ll email you a link to set a password)"
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div role="radiogroup" aria-label="Payment method" className="grid gap-3 sm:grid-cols-2">
                <PayOption
                  active={form.payment === "card"}
                  onClick={() => set("payment", "card")}
                  icon={<CreditCard />}
                  title="Pay now by card"
                  body="Coming soon"
                  disabled
                />
                <PayOption
                  active={form.payment === "later"}
                  onClick={() => set("payment", "later")}
                  icon={<Banknote />}
                  title="Pay after the job"
                  body="We email an invoice once it’s done"
                />
              </div>

              {/* PAYMENT PLACEHOLDER — card payments are added in the payments batch (provider not chosen yet). */}
              <p className="flex items-center gap-2 text-xs text-muted">
                <Lock className="size-3.5" /> Nothing is charged now. We email a tax invoice once the job is done.
              </p>

              <div>
                <Field label="Promo code" htmlFor="coupon" error={couponError}>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      value={form.coupon}
                      onChange={(e) => {
                        set("coupon", e.target.value);
                        if (couponApplied) setCouponApplied(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onApplyCoupon();
                        }
                      }}
                      placeholder="Promo code"
                      className="uppercase"
                      autoComplete="off"
                    />
                    <Button type="button" variant="outline" className="h-11" onClick={onApplyCoupon} disabled={checkingCoupon}>
                      {checkingCoupon ? "Checking…" : "Apply"}
                    </Button>
                  </div>
                </Field>
                {couponValid && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ink-900">
                    <Tag className="size-3.5" /> {couponApplied.code} applied — you save {money2(discount)}
                  </p>
                )}
                {couponApplied && !couponValid && (
                  <p className="mt-2 text-sm text-danger">
                    {couponApplied.code} needs a minimum spend of {money(couponApplied.minSpend)}.
                  </p>
                )}
              </div>

              <Checkbox
                checked={form.agree}
                onChange={(e) => set("agree", e.target.checked)}
                label={
                  <>
                    I agree to the{" "}
                    <Link href="/terms" className="underline underline-offset-4" target="_blank">
                      terms of service
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms#cancellations" className="underline underline-offset-4" target="_blank">
                      cancellation policy
                    </Link>
                    .
                  </>
                }
              />
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || submitting}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button
                size="lg"
                onClick={() => {
                  setSubmitError("");
                  setStep((s) => s + 1);
                }}
                disabled={!canContinue}
              >
                Continue
              </Button>
            ) : (
              <Button size="lg" onClick={confirm} disabled={!canContinue || submitting}>
                {submitting ? "Booking…" : `Confirm booking (${money2(total)})`}
              </Button>
            )}
          </div>
          {submitError && (
            <p role="alert" className="mt-4 rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger">
              {submitError}
            </p>
          )}
        </div>
      </div>

      {/* Summary ---------------------------------------------------------- */}
      <aside>
        <div className="sticky top-28 rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <div className="flex items-center gap-3">
            <CategoryIcon icon={category.icon} />
            <div>
              <p className="font-semibold">{category.name}</p>
              <p className="text-sm text-muted">{pkg.duration}</p>
            </div>
          </div>

          <Field label="Package" className="mt-5">
            <Select value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {money(p.price)}
                </option>
              ))}
            </Select>
          </Field>

          {addOns.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Extras</p>
              {addOns.map((a) => (
                <Checkbox
                  key={a.id}
                  checked={extras.includes(a.id)}
                  onChange={() => setExtras((x) => (x.includes(a.id) ? x.filter((i) => i !== a.id) : [...x, a.id]))}
                  label={
                    <span className="flex w-full justify-between gap-3">
                      {a.name} <span className="text-muted">+{money(a.price)}</span>
                    </span>
                  }
                />
              ))}
            </div>
          )}

          {(form.suburb || form.date) && (
            <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
              {form.suburb && (
                <p className="flex items-center gap-2 text-muted">
                  <MapPin className="size-4" /> {form.street ? `${form.street}, ` : ""}
                  {form.suburb}
                </p>
              )}
              {form.date && (
                <p className="flex items-center gap-2 text-muted">
                  <Check className="size-4" />
                  {formatISODate(form.date)}
                  {form.slot && `, ${form.slot}`}
                </p>
              )}
            </div>
          )}

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[15px]">
            <Row label={pkg.name} value={money2(pkg.price)} />
            {chosenExtras.map((a) => (
              <Row key={a.id} label={a.name} value={money2(a.price)} />
            ))}
            {travel > 0 && <Row label="Travel fee" value={money2(travel)} />}
            {discount > 0 && <Row label={`Promo ${couponApplied.code}`} value={`−${money2(discount)}`} accent />}
          </dl>
          <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
            <div>
              <p className="text-sm text-muted">Total</p>
              <p className="text-xs text-subtle">Includes {money2(total / 11)} GST</p>
            </div>
            <p className="font-display text-3xl font-semibold">{money2(total)}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={accent ? "font-medium text-ink-900" : ""}>{value}</dd>
    </div>
  );
}

function PayOption({ active, onClick, icon, title, body, disabled }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-5",
        active ? "border-ink-900 bg-ink-50/50" : "border-line hover:border-line-strong",
      )}
    >
      <span className={cn("mt-0.5 [&_svg]:size-5", active ? "text-ink-900" : "text-muted")}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
    </button>
  );
}