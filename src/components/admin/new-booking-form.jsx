// src/components/admin/new-booking-form.jsx
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createAdminBooking } from "@/server/actions/admin-bookings";
import { money } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";

/**
 * Manual booking for phone/email customers. Prices come from the catalogue
 * (re-checked on the server) unless an override is entered.
 * `catalog` = [{ slug, name, packages: [...], addOns: [...] }] from the database.
 */
export function NewBookingForm({ catalog, customers, suburbs, timeSlots, initialCustomerId = "" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  // Set when the booking was created but its confirmation email didn't go out.
  const [created, setCreated] = useState(null);
  const [customerMode, setCustomerMode] = useState(customers.length ? "existing" : "new");
  const [customerId, setCustomerId] = useState(
    customers.some((c) => c.id === initialCustomerId) ? initialCustomerId : (customers[0]?.id ?? ""),
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [cat, setCat] = useState(catalog[0]?.slug ?? "");
  const category = catalog.find((c) => c.slug === cat);
  const [pkgId, setPkgId] = useState(category?.packages[0]?.id ?? "");
  const [extras, setExtras] = useState([]);
  const [v, setV] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    suburb: "",
    date: "",
    slot: timeSlots[0] ?? "",
    notes: "",
    override: "",
    payment: "later",
    sendConfirmation: true,
  });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const pkg = category?.packages.find((p) => p.id === pkgId) ?? category?.packages[0];
  const travel = suburbs.find((s) => s.name === v.suburb)?.surcharge ?? 0;
  const total =
    (pkg?.price ?? 0) + (category?.addOns ?? []).filter((a) => extras.includes(a.id)).reduce((s, a) => s + a.price, 0) + travel;

  const shownCustomers = useMemo(() => {
    const t = customerSearch.trim().toLowerCase();
    const list = t ? customers.filter((c) => `${c.name} ${c.email} ${c.phone ?? ""}`.toLowerCase().includes(t)) : customers;
    // Keep the selected customer visible (e.g. when the search has no matches)
    return list.some((c) => c.id === customerId) ? list : [...customers.filter((c) => c.id === customerId), ...list];
  }, [customers, customerSearch, customerId]);

  if (!catalog.length) {
    return <Card className="p-8 text-center text-muted">Add a published service with at least one package first.</Card>;
  }

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const res = await createAdminBooking({
            customerMode,
            customerId,
            name: v.name,
            email: v.email,
            phone: v.phone,
            categorySlug: cat,
            packageId: pkg?.id ?? "",
            addOnIds: extras,
            street: v.street,
            suburb: v.suburb,
            date: v.date,
            slot: v.slot,
            notes: v.notes,
            override: v.override,
            payment: v.payment,
            sendConfirmation: v.sendConfirmation,
          });
          if (!res.ok) return setError(res.error);
          if (res.warning) return setCreated({ reference: res.reference, warning: res.warning });
          router.push(`/admin/bookings/${res.reference}`);
        });
      }}
    >
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader
            title="Customer"
            action={
              <Select value={customerMode} onChange={(e) => setCustomerMode(e.target.value)} className="h-9 w-44 text-sm">
                <option value="existing" disabled={!customers.length}>
                  Existing customer
                </option>
                <option value="new">New customer</option>
              </Select>
            }
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {customerMode === "existing" ? (
              <>
                <Field label="Find customer" htmlFor="nb-find">
                  <Input
                    id="nb-find"
                    value={customerSearch}
                    onChange={(e) => {
                      const term = e.target.value;
                      setCustomerSearch(term);
                      // Select the first match so the booking never goes to a customer hidden by the search.
                      const t = term.trim().toLowerCase();
                      const first = t && customers.find((c) => `${c.name} ${c.email} ${c.phone ?? ""}`.toLowerCase().includes(t));
                      if (first) setCustomerId(first.id);
                    }}
                    placeholder="Name, email or phone"
                  />
                </Field>
                <Field label="Customer" htmlFor="nb-customer">
                  <Select id="nb-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    {shownCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.email}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : (
              <>
                <Field label="Full name" htmlFor="nb-name">
                  <Input id="nb-name" value={v.name} onChange={set("name")} required maxLength={120} />
                </Field>
                <Field label="Mobile" htmlFor="nb-phone">
                  <Input id="nb-phone" type="tel" value={v.phone} onChange={set("phone")} required maxLength={32} />
                </Field>
                <Field
                  label="Email"
                  htmlFor="nb-email"
                  className="sm:col-span-2"
                  hint="If this email already has an account, the booking is added to it."
                >
                  <Input id="nb-email" type="email" value={v.email} onChange={set("email")} required maxLength={255} />
                </Field>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Service" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Service" htmlFor="nb-cat">
              <Select
                id="nb-cat"
                value={cat}
                onChange={(e) => {
                  const next = catalog.find((c) => c.slug === e.target.value);
                  setCat(e.target.value);
                  setPkgId(next?.packages[0]?.id ?? "");
                  setExtras([]);
                }}
              >
                {catalog.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Package" htmlFor="nb-pkg">
              <Select id="nb-pkg" value={pkg?.id ?? ""} onChange={(e) => setPkgId(e.target.value)}>
                {category?.packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price)}
                  </option>
                ))}
              </Select>
            </Field>
            {category?.addOns.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Extras</p>
                {category.addOns.map((a) => (
                  <Checkbox
                    key={a.id}
                    checked={extras.includes(a.id)}
                    onChange={() => setExtras((x) => (x.includes(a.id) ? x.filter((i) => i !== a.id) : [...x, a.id]))}
                    label={`${a.name} (+${money(a.price)})`}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Where and when" description="Admins can book any day, including Sundays and short notice." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Street address" htmlFor="nb-street">
              <Input id="nb-street" value={v.street} onChange={set("street")} required maxLength={200} />
            </Field>
            <Field label="Suburb" htmlFor="nb-suburb" hint={travel ? `Travel fee ${money(travel)}` : undefined}>
              <Select id="nb-suburb" value={v.suburb} onChange={set("suburb")} required>
                <option value="">Select suburb</option>
                {suburbs.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} {s.postcode}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date" htmlFor="nb-date">
              <Input id="nb-date" type="date" value={v.date} onChange={set("date")} required />
            </Field>
            <Field label="Arrival window" htmlFor="nb-slot">
              <Select id="nb-slot" value={v.slot} onChange={set("slot")} required>
                {timeSlots.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Access notes" htmlFor="nb-notes" className="sm:col-span-2">
              <Textarea id="nb-notes" value={v.notes} onChange={set("notes")} maxLength={1000} />
            </Field>
          </div>
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-24">
        <CardHeader title="Summary" />
        <div className="space-y-4 p-5">
          <div className="flex items-end justify-between">
            <span className="text-sm text-muted">Total, GST incl.</span>
            <span className="font-display text-3xl font-semibold">
              {money(v.override !== "" ? Number(v.override) || 0 : total)}
            </span>
          </div>
          <Field label="Price override ($)" htmlFor="nb-override" hint="Optional, for custom quotes.">
            <Input
              id="nb-override"
              type="number"
              min="0"
              step="0.01"
              value={v.override}
              onChange={set("override")}
              placeholder={String(total)}
            />
          </Field>
          <Field label="Payment" htmlFor="nb-payment">
            <Select id="nb-payment" value={v.payment} onChange={set("payment")}>
              <option value="later">Pay after the job (invoice)</option>
              <option value="paid">Already paid</option>
            </Select>
          </Field>
          <Checkbox checked={v.sendConfirmation} onChange={set("sendConfirmation")} label="Email confirmation to customer" />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {created ? (
            <>
              <p role="status" className="text-sm text-warn">
                {created.warning}
              </p>
              <ButtonLink href={`/admin/bookings/${created.reference}`} className="w-full" size="lg">
                Open booking {created.reference}
              </ButtonLink>
            </>
          ) : (
            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? "Creating…" : "Create booking"}
            </Button>
          )}
        </div>
      </Card>
    </form>
  );
}