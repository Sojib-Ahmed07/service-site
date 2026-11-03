"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Banknote, Check, CreditCard, Lock, MapPin, Tag } from "lucide-react";
import { coupons, suburbs, timeSlots } from "@/lib/data";
import { cn, money, money2 } from "@/lib/utils";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";

const steps = ["Address", "Date & time", "Your details", "Payment"];

/**
 * Four-step checkout. Everything is client state for now — on "Confirm booking"
 * replace the router.push with a Server Action that inserts into `bookings`.
 */
export function BookingFlow({ category, packages, addOns, initialPackageId, initialAddOns, initialSuburb }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pkgId, setPkgId] = useState(initialPackageId);
  const [extras, setExtras] = useState(initialAddOns);
  const [form, setForm] = useState({
    suburb: initialSuburb,
    street: "",
    access: "",
    date: "",
    slot: "",
    name: "",
    email: "",
    phone: "",
    createAccount: true,
    payment: "later",
    coupon: "",
    agree: false,
  });
  const [couponApplied, setCouponApplied] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [days, setDays] = useState([]);

  useEffect(() => {
    // Built on the client so the dates always match the visitor's "today".
    const out = [];
    const start = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    setDays(out);
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pkg = packages.find((p) => p.id === pkgId);
  const chosenExtras = addOns.filter((a) => extras.includes(a.id));
  const suburbInfo = suburbs.find((s) => s.name === form.suburb);
  const travel = suburbInfo?.surcharge ?? 0;
  const subtotal = pkg.price + chosenExtras.reduce((s, a) => s + a.price, 0) + travel;
  const discount = couponApplied
    ? couponApplied.type === "percent"
      ? Math.round(subtotal * couponApplied.value) / 100
      : couponApplied.value
    : 0;
  const total = Math.max(0, subtotal - discount);

  const canContinue = [
    form.suburb && form.street.trim().length > 3,
    form.date && form.slot,
    form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.phone.trim().length >= 8,
    form.agree,
  ][step];

  const applyCoupon = () => {
    const c = coupons.find((x) => x.code === form.coupon.trim().toUpperCase() && x.active);
    if (!c) return setCouponError("That code isn’t valid or has expired.");
    if (subtotal < c.minSpend) return setCouponError(`This code needs a minimum spend of ${money(c.minSpend)}.`);
    setCouponError("");
    setCouponApplied(c);
  };

  const confirm = () => {
    // TODO: call a Server Action → insert booking, take payment, send confirmation email.
    router.push(
      `/book/success?ref=HD-24818&service=${encodeURIComponent(category.name)}&date=${form.date}&slot=${encodeURIComponent(form.slot)}`,
    );
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
              <Field
                label="Suburb"
                htmlFor="suburb"
                hint={travel ? `A ${money(travel)} travel fee applies to ${form.suburb}.` : "Greater Hobart only."}
              >
                <Select id="suburb" value={form.suburb} onChange={(e) => set("suburb", e.target.value)}>
                  <option value="">Select your suburb</option>
                  {suburbs.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} {s.postcode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Street address" htmlFor="street">
                <Input
                  id="street"
                  value={form.street}
                  onChange={(e) => set("street", e.target.value)}
                  placeholder="e.g. 14 Pirie Street"
                  autoComplete="street-address"
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
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="font-semibold">Choose a day</p>
              <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
                {days.length === 0 && <div className="h-20 w-full animate-pulse rounded-2xl bg-paper" />}
                {days.map((d) => {
                  const iso = d.toISOString().slice(0, 10);
                  const sunday = d.getDay() === 0;
                  const active = form.date === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={sunday}
                      onClick={() => set("date", iso)}
                      className={cn(
                        "flex w-[72px] shrink-0 flex-col items-center rounded-2xl border-2 py-3 transition-colors disabled:opacity-40",
                        active ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-surface hover:border-line-strong",
                      )}
                    >
                      <span className={cn("text-xs", active ? "text-ink-100" : "text-muted")}>
                        {d.toLocaleDateString("en-AU", { weekday: "short" })}
                      </span>
                      <span className="font-display text-2xl font-semibold">{d.getDate()}</span>
                      <span className={cn("text-xs", active ? "text-ink-100" : "text-muted")}>
                        {d.toLocaleDateString("en-AU", { month: "short" })}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted">We don’t book on Sundays.</p>

              <p className="mt-8 font-semibold">Arrival window</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {timeSlots.map((s, i) => {
                  const full = i === 3; // example of an unavailable slot
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!form.date || full}
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
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <p className="text-sm text-muted sm:col-span-2">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-ink-900 underline underline-offset-4">
                  Log in
                </Link>{" "}
                to use your saved details.
              </p>
              <Field label="Full name" htmlFor="name" className="sm:col-span-2">
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
              </Field>
              <Field label="Email" htmlFor="email" hint="We’ll send your confirmation here.">
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  autoComplete="email"
                />
              </Field>
              <Field label="Mobile" htmlFor="phone" hint="For day-of updates by SMS.">
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="04xx xxx xxx"
                  autoComplete="tel"
                />
              </Field>
              <Checkbox
                className="sm:col-span-2"
                checked={form.createAccount}
                onChange={(e) => set("createAccount", e.target.checked)}
                label="Create an account so I can manage and rebook this job"
              />
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
                  body="Visa, Mastercard, Amex, Apple Pay"
                />
                <PayOption
                  active={form.payment === "later"}
                  onClick={() => set("payment", "later")}
                  icon={<Banknote />}
                  title="Pay after the job"
                  body="We email an invoice once it’s done"
                />
              </div>

              {form.payment === "card" && (
                /* PAYMENT PLACEHOLDER — swap this block for Stripe <PaymentElement /> or Square Web Payments SDK */
                <div className="rounded-2xl border border-dashed border-line-strong bg-paper p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Card number" className="sm:col-span-2">
                      <Input placeholder="1234 1234 1234 1234" disabled />
                    </Field>
                    <Field label="Expiry">
                      <Input placeholder="MM / YY" disabled />
                    </Field>
                    <Field label="CVC">
                      <Input placeholder="123" disabled />
                    </Field>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <Lock className="size-3.5" /> Card payments are being connected. Choose “Pay after the job” for now.
                  </p>
                </div>
              )}

              <div>
                <Field label="Promo code" htmlFor="coupon" error={couponError}>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      value={form.coupon}
                      onChange={(e) => set("coupon", e.target.value)}
                      placeholder="e.g. WELCOME15"
                      className="uppercase"
                    />
                    <Button type="button" variant="outline" className="h-11" onClick={applyCoupon}>
                      Apply
                    </Button>
                  </div>
                </Field>
                {couponApplied && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ink-900">
                    <Tag className="size-3.5" /> {couponApplied.code} applied — you save {money2(discount)}
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
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button size="lg" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                Continue
              </Button>
            ) : (
              <Button size="lg" onClick={confirm} disabled={!canContinue}>
                Confirm booking ({money2(total)})
              </Button>
            )}
          </div>
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
                  {new Date(form.date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
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

function PayOption({ active, onClick, icon, title, body }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors [&>svg]:size-5",
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
