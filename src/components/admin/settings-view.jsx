"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { adminUsers, timeSlots } from "@/lib/data";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Switch, Tabs, useToast } from "@/components/ui/interactive";

const gateways = [
  { id: "stripe", name: "Stripe", body: "Cards, Apple Pay and Google Pay. 1.7% + 30c for domestic cards.", popular: true },
  { id: "square", name: "Square", body: "Good if you also take payments in person." },
  { id: "tyro", name: "Tyro", body: "Australian bank, competitive rates for higher volumes." },
  { id: "paypal", name: "PayPal", body: "Add as a second option alongside cards." },
];

export function SettingsView({ defaultTab = "business" }) {
  const { toast, toastNode } = useToast();
  const [gateway, setGateway] = useState(null);
  const save = () => toast("Settings saved");

  const Row = ({ label, hint, children }) => (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );

  const business = (
    <Card>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Business name">
          <Input defaultValue={site.name} />
        </Field>
        <Field label="ABN">
          <Input defaultValue={site.abn} />
        </Field>
        <Field label="Phone">
          <Input defaultValue={site.phone} />
        </Field>
        <Field label="Email">
          <Input defaultValue={site.email} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input defaultValue={site.address} />
        </Field>
        <Field label="Opening hours">
          <Input defaultValue={site.hours} />
        </Field>
        <Field label="Time zone">
          <Select defaultValue="Australia/Hobart">
            <option>Australia/Hobart</option>
          </Select>
        </Field>
        <Field label="GST">
          <Select defaultValue="registered">
            <option value="registered">Registered — prices include GST</option>
            <option value="not">Not registered</option>
          </Select>
        </Field>
        <Field label="Logo">
          <Input type="file" accept="image/*" className="py-2" />
        </Field>
      </div>
      <div className="border-t border-line px-5 py-3">
        <Button onClick={save}>Save</Button>
      </div>
    </Card>
  );

  const booking = (
    <Card>
      <div className="divide-y divide-line">
        <Row label="Minimum notice" hint="How soon customers can book.">
          <Select defaultValue="24" className="w-48">
            <option value="2">2 hours</option>
            <option value="12">12 hours</option>
            <option value="24">Next day</option>
            <option value="48">2 days</option>
          </Select>
        </Row>
        <Row label="Booking window" hint="How far ahead customers can book.">
          <Select defaultValue="60" className="w-48">
            <option value="14">2 weeks</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
          </Select>
        </Row>
        <Row label="Free cancellation until" hint="Before the arrival window starts.">
          <Select defaultValue="24" className="w-48">
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
          </Select>
        </Row>
        <Row label="Late cancellation fee">
          <Select defaultValue="50" className="w-48">
            <option value="0">None</option>
            <option value="25">25%</option>
            <option value="50">50%</option>
            <option value="100">100%</option>
          </Select>
        </Row>
        <Row label="Max jobs per arrival window" hint="Across all providers. Protects you from overbooking.">
          <Input type="number" defaultValue={6} className="w-48" />
        </Row>
        <Row label="Take bookings on Sundays">
          <Switch label="Sundays" />
        </Row>
        <Row label="Require deposit" hint="Charge part of the price at booking.">
          <Switch label="Require deposit" />
        </Row>
        <div className="px-5 py-4">
          <p className="font-medium">Arrival windows</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {timeSlots.map((s) => (
              <span key={s} className="rounded-full bg-paper px-3 py-1.5 text-sm ring-1 ring-line">
                {s}
              </span>
            ))}
            <Button variant="outline" size="sm">
              <Plus /> Add window
            </Button>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-5 py-3">
        <Button onClick={save}>Save</Button>
      </div>
    </Card>
  );

  const notifications = (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Automatic messages" description="What customers receive, and how." />
        <div className="divide-y divide-line">
          {[
            ["Booking confirmation", true, true],
            ["Provider assigned", true, true],
            ["Reminder the day before", false, true],
            ["Job completed + review request", true, true],
            ["Cancellation", true, true],
          ].map(([label, email, sms]) => (
            <Row key={label} label={label}>
              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <Switch defaultChecked={email} label={`${label} email`} /> Email
                </label>
                <label className="flex items-center gap-2">
                  <Switch defaultChecked={sms} label={`${label} SMS`} /> SMS
                </label>
              </div>
            </Row>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Provider job sheet (SMS template)"
          description="Sent when you click “Send job sheet”. Variables in braces."
        />
        <div className="p-5">
          <Textarea
            className="min-h-32 font-mono text-sm"
            defaultValue={
              "New Sorted job {booking_id}\n{service} — {package}\n{date}, {slot}\n{address}\nNotes: {access_notes}\nPay: {provider_pay}\nReply YES to confirm."
            }
          />
        </div>
      </Card>
      <Card>
        <CardHeader title="Admin alerts" />
        <div className="divide-y divide-line">
          <Row label="Email me about new bookings">
            <Switch defaultChecked label="New booking alerts" />
          </Row>
          <Row label="Alert when a booking is unassigned for 4+ hours">
            <Switch defaultChecked label="Unassigned alerts" />
          </Row>
          <Row label="Provider document expiry reminders">
            <Switch defaultChecked label="Document reminders" />
          </Row>
        </div>
      </Card>
    </div>
  );

  const payments = (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {gateways.map((g) => (
          <button
            key={g.id}
            onClick={() => setGateway(g.id)}
            className={cn(
              "rounded-[var(--radius-card)] border-2 bg-surface p-5 text-left transition-colors",
              gateway === g.id ? "border-ink-900" : "border-line hover:border-line-strong",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">{g.name}</p>
              {g.popular && <Badge tone="success">Recommended</Badge>}
              {gateway === g.id && <Check className="size-5 text-brand-600" />}
            </div>
            <p className="mt-1 text-sm text-muted">{g.body}</p>
          </button>
        ))}
      </div>
      {gateway && (
        <Card>
          <CardHeader
            title={`Connect ${gateways.find((g) => g.id === gateway).name}`}
            description="Keys are stored as environment variables on the server, never in the browser."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Publishable key">
              <Input placeholder="pk_live_…" />
            </Field>
            <Field label="Secret key">
              <Input type="password" placeholder="sk_live_…" />
            </Field>
            <Field label="Mode">
              <Select>
                <option>Test</option>
                <option>Live</option>
              </Select>
            </Field>
            <Field label="Capture">
              <Select>
                <option>Authorise at booking, capture after job</option>
                <option>Charge at booking</option>
              </Select>
            </Field>
          </div>
          <div className="border-t border-line px-5 py-3">
            <Button onClick={() => toast("Gateway saved (test mode)")}>Save and test</Button>
          </div>
        </Card>
      )}
      <Card>
        <div className="divide-y divide-line">
          <Row label="Allow “Pay after the job”" hint="Customers receive an invoice once the job is complete.">
            <Switch defaultChecked label="Pay later" />
          </Row>
          <Row label="Invoice payment terms">
            <Select defaultValue="7" className="w-48">
              <option value="0">Due on receipt</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </Select>
          </Row>
        </div>
      </Card>
    </div>
  );

  const team = (
    <Card>
      <CardHeader
        title="Admin team"
        description="Everyone here has full access to the admin panel."
        action={
          <Button size="sm" onClick={() => toast("Invite sent")}>
            <Plus /> Invite admin
          </Button>
        }
      />
      <ul className="divide-y divide-line">
        {adminUsers.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar name={u.name} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{u.name}</p>
              <p className="text-xs text-muted">{u.email}</p>
            </div>
            <Badge tone={u.role === "Owner" ? "success" : "neutral"}>{u.role}</Badge>
            <span className="hidden w-28 text-right text-xs text-muted sm:block">{u.lastActive}</span>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <>
      <Tabs
        defaultTab={defaultTab}
        tabs={[
          { id: "business", label: "Business", content: business },
          { id: "booking", label: "Booking rules", content: booking },
          { id: "notifications", label: "Notifications", content: notifications },
          { id: "payments", label: "Payments", content: payments },
          { id: "team", label: "Team", content: team },
        ]}
      />
      {toastNode}
    </>
  );
}
