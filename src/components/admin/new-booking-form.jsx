"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addOnsFor, categories, customers, packagesFor, suburbs, timeSlots } from "@/lib/data";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";

export function NewBookingForm() {
  const router = useRouter();
  const [customerMode, setCustomerMode] = useState("existing");
  const [cat, setCat] = useState(categories[0].slug);
  const pkgs = packagesFor(cat);
  const [pkgId, setPkgId] = useState(pkgs[0].id);
  const [extras, setExtras] = useState([]);
  const pkg = pkgs.find((p) => p.id === pkgId) ?? pkgs[0];
  const total =
    pkg.price +
    addOnsFor(cat)
      .filter((a) => extras.includes(a.id))
      .reduce((s, a) => s + a.price, 0);

  return (
    <form
      className="grid gap-6 xl:grid-cols-[1fr_340px]"
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/admin/bookings/HD-24817");
      }}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Customer"
            action={
              <Select value={customerMode} onChange={(e) => setCustomerMode(e.target.value)} className="h-9 w-44 text-sm">
                <option value="existing">Existing customer</option>
                <option value="new">New customer</option>
              </Select>
            }
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {customerMode === "existing" ? (
              <Field label="Customer" className="sm:col-span-2">
                <Select>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.email}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <>
                <Field label="Full name">
                  <Input required />
                </Field>
                <Field label="Mobile">
                  <Input type="tel" required />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <Input type="email" required />
                </Field>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Service" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Service">
              <Select
                value={cat}
                onChange={(e) => {
                  setCat(e.target.value);
                  setPkgId(packagesFor(e.target.value)[0].id);
                  setExtras([]);
                }}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Package">
              <Select value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
                {pkgs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price)}
                  </option>
                ))}
              </Select>
            </Field>
            {addOnsFor(cat).length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">Extras</p>
                {addOnsFor(cat).map((a) => (
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
          <CardHeader title="Where and when" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Street address">
              <Input required />
            </Field>
            <Field label="Suburb">
              <Select>
                {suburbs.map((s) => (
                  <option key={s.name}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" required />
            </Field>
            <Field label="Arrival window">
              <Select>
                {timeSlots.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Access notes" className="sm:col-span-2">
              <Textarea />
            </Field>
          </div>
        </Card>
      </div>

      <Card className="h-fit xl:sticky xl:top-24">
        <CardHeader title="Summary" />
        <div className="space-y-4 p-5">
          <div className="flex items-end justify-between">
            <span className="text-sm text-muted">Total, GST incl.</span>
            <span className="font-display text-3xl font-semibold">{money(total)}</span>
          </div>
          <Field label="Price override" hint="Optional, for custom quotes.">
            <Input type="number" placeholder={String(total)} />
          </Field>
          <Field label="Payment">
            <Select>
              <option>Send payment link</option>
              <option>Pay after the job (invoice)</option>
              <option>Already paid</option>
            </Select>
          </Field>
          <Checkbox defaultChecked label="Email confirmation to customer" />
          <Button type="submit" className="w-full" size="lg">
            Create booking
          </Button>
        </div>
      </Card>
    </form>
  );
}
