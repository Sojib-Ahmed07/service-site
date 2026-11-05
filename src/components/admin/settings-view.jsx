// src/components/admin/settings-view.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreditCard, Plus, Trash2, UserMinus } from "lucide-react";
import {
  addAdmin,
  removeAdmin,
  saveBookingRules,
  saveBusiness,
  saveNotifications,
  savePaymentSettings,
  setTeamRole,
} from "@/server/actions/admin-settings";
import { formatDate } from "@/lib/utils";
import { Avatar, Badge, Card, CardHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, Switch, Tabs, useToast } from "@/components/ui/interactive";

const teamRoles = ["Owner", "Operations", "Support"];
const intOrNaN = (v) => (String(v).trim() === "" ? Number.NaN : Number(v));

function Row({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SaveBar({ pending, error, onSave, label = "Save" }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
      <Button onClick={onSave} disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Runs a save action with pending + error state, a toast and a refresh. */
function useSave(toast, message = "Settings saved") {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn) =>
    start(async () => {
      setError("");
      const res = await fn();
      if (!res.ok) return setError(res.error);
      toast(message);
      router.refresh();
    });
  return { pending, error, run };
}

/**
 * Admin › Settings. Props come from the server: business, booking (rules),
 * notifications, payments, team ([{ id, name, email, teamRole, lastSeen }]) and me (the admin).
 */
export function SettingsView({ defaultTab = "business", business, booking, notifications, payments, team, me }) {
  const { toast, toastNode } = useToast();
  // Form state lives here so switching tabs doesn't throw away unsaved changes.
  const [biz, setBiz] = useState({
    name: business.name ?? "",
    tagline: business.tagline ?? "",
    description: business.description ?? "",
    abn: business.abn ?? "",
    phone: business.phone ?? "",
    email: business.email ?? "",
    address: business.address ?? "",
    hours: business.hours ?? "",
    city: business.city ?? "",
    region: business.region ?? "",
    facebook: business.social?.facebook ?? "",
    instagram: business.social?.instagram ?? "",
  });
  const [rules, setRules] = useState({
    minNoticeHours: String(booking.minNoticeHours ?? 24),
    windowDays: String(booking.windowDays ?? 14),
    freeCancelHours: String(booking.freeCancelHours ?? 24),
    lateCancelFeePercent: String(booking.lateCancelFeePercent ?? 50),
    guaranteeHours: String(booking.guaranteeHours ?? 48),
    maxJobsPerSlot: String(booking.maxJobsPerSlot ?? 0),
    sundays: Boolean(booking.sundays),
    timeSlots: booking.timeSlots?.length ? [...booking.timeSlots] : [""],
  });
  const [notes, setNotes] = useState({
    jobSheetTemplate: notifications.jobSheetTemplate ?? "",
    emails: { confirmation: notifications.emails?.confirmation !== false, cancellation: notifications.emails?.cancellation !== false },
    adminNewBooking: notifications.adminNewBooking !== false,
  });
  const [invoiceDays, setInvoiceDays] = useState(String(payments.invoiceDays ?? 7));

  return (
    <>
      <Tabs
        defaultTab={defaultTab}
        tabs={[
          { id: "business", label: "Business", content: <BusinessTab biz={biz} setBiz={setBiz} toast={toast} /> },
          { id: "booking", label: "Booking rules", content: <BookingTab rules={rules} setRules={setRules} toast={toast} /> },
          {
            id: "notifications",
            label: "Notifications",
            content: <NotificationsTab notes={notes} setNotes={setNotes} businessEmail={business.email} toast={toast} />,
          },
          {
            id: "payments",
            label: "Payments",
            content: <PaymentsTab invoiceDays={invoiceDays} setInvoiceDays={setInvoiceDays} toast={toast} />,
          },
          { id: "team", label: "Team", content: <TeamTab team={team} me={me} toast={toast} /> },
        ]}
      />
      {toastNode}
    </>
  );
}

/* Business ------------------------------------------------------------------ */

function BusinessTab({ biz, setBiz, toast }) {
  const { pending, error, run } = useSave(toast, "Business details saved");
  const set = (k) => (e) => setBiz((b) => ({ ...b, [k]: e.target.value }));
  const save = () =>
    run(() =>
      saveBusiness({
        name: biz.name,
        tagline: biz.tagline,
        description: biz.description,
        abn: biz.abn,
        phone: biz.phone,
        email: biz.email,
        address: biz.address,
        hours: biz.hours,
        city: biz.city,
        region: biz.region,
        social: { facebook: biz.facebook.trim(), instagram: biz.instagram.trim() },
      }),
    );
  return (
    <Card>
      <CardHeader title="Business details" description="Shown in the header, footer, contact page, emails and invoices." />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Business name">
          <Input value={biz.name} onChange={set("name")} maxLength={80} />
        </Field>
        <Field label="ABN">
          <Input value={biz.abn} onChange={set("abn")} maxLength={20} inputMode="numeric" />
        </Field>
        <Field label="Phone">
          <Input value={biz.phone} onChange={set("phone")} maxLength={32} type="tel" />
        </Field>
        <Field label="Email" hint="Also where new-booking alerts go.">
          <Input value={biz.email} onChange={set("email")} maxLength={255} type="email" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={biz.address} onChange={set("address")} maxLength={200} />
        </Field>
        <Field label="Opening hours">
          <Input value={biz.hours} onChange={set("hours")} maxLength={80} placeholder="Mon–Sat, 7am–7pm" />
        </Field>
        <Field label="Time zone" hint="Bookings run on Hobart time.">
          <Input value="Australia/Hobart" disabled />
        </Field>
        <Field label="City">
          <Input value={biz.city} onChange={set("city")} maxLength={60} />
        </Field>
        <Field label="Region you cover">
          <Input value={biz.region} onChange={set("region")} maxLength={80} />
        </Field>
        <Field label="Tagline" className="sm:col-span-2">
          <Input value={biz.tagline} onChange={set("tagline")} maxLength={120} />
        </Field>
        <Field label="Short description" hint="Used in the footer and search results." className="sm:col-span-2">
          <Textarea value={biz.description} onChange={set("description")} maxLength={300} />
        </Field>
        <Field label="Facebook page">
          <Input value={biz.facebook} onChange={set("facebook")} placeholder="https://facebook.com/…" maxLength={255} />
        </Field>
        <Field label="Instagram">
          <Input value={biz.instagram} onChange={set("instagram")} placeholder="https://instagram.com/…" maxLength={255} />
        </Field>
      </div>
      <SaveBar pending={pending} error={error} onSave={save} />
    </Card>
  );
}

/* Booking rules ------------------------------------------------------------- */

function BookingTab({ rules, setRules, toast }) {
  const { pending, error, run } = useSave(toast, "Booking rules saved");
  const set = (k) => (e) => setRules((r) => ({ ...r, [k]: e.target.value }));
  const setSlot = (i, v) => setRules((r) => ({ ...r, timeSlots: r.timeSlots.map((s, j) => (j === i ? v : s)) }));
  const save = () =>
    run(() =>
      saveBookingRules({
        minNoticeHours: intOrNaN(rules.minNoticeHours),
        windowDays: intOrNaN(rules.windowDays),
        freeCancelHours: intOrNaN(rules.freeCancelHours),
        lateCancelFeePercent: intOrNaN(rules.lateCancelFeePercent),
        guaranteeHours: intOrNaN(rules.guaranteeHours),
        maxJobsPerSlot: intOrNaN(rules.maxJobsPerSlot),
        sundays: rules.sundays,
        timeSlots: rules.timeSlots.map((s) => s.trim()).filter(Boolean),
      }),
    );
  const num = (k, suffix, props = {}) => (
    <div className="flex items-center gap-2">
      <Input type="number" min={0} value={rules[k]} onChange={set(k)} className="w-28" aria-label={k} {...props} />
      <span className="w-12 text-sm text-muted">{suffix}</span>
    </div>
  );
  return (
    <Card>
      <div className="divide-y divide-line">
        <Row label="Minimum notice" hint="How soon customers can book. 24 hours = from tomorrow.">
          {num("minNoticeHours", "hours")}
        </Row>
        <Row label="Booking window" hint="How far ahead customers can book.">
          {num("windowDays", "days", { min: 1 })}
        </Row>
        <Row label="Free changes until" hint="Customers can reschedule or cancel online until this long before arrival.">
          {num("freeCancelHours", "hours")}
        </Row>
        <Row label="Late change fee" hint="Shown in your terms. Charged by you, case by case.">
          {num("lateCancelFeePercent", "%", { max: 100 })}
        </Row>
        <Row label="Guarantee window" hint="How long customers have to report a problem.">
          {num("guaranteeHours", "hours", { min: 1 })}
        </Row>
        <Row label="Max jobs per arrival window" hint="Across all providers. 0 = no limit.">
          {num("maxJobsPerSlot", "jobs")}
        </Row>
        <Row label="Take bookings on Sundays">
          <Switch checked={rules.sundays} onChange={(v) => setRules((r) => ({ ...r, sundays: v }))} label="Sundays" />
        </Row>
        <div className="px-5 py-4">
          <p className="font-medium">Arrival windows</p>
          <p className="text-sm text-muted">
            Write them like 7:00–9:00am or 11:00am–1:00pm. Existing bookings keep their window if you remove one.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rules.timeSlots.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input value={s} onChange={(e) => setSlot(i, e.target.value)} maxLength={40} aria-label={`Arrival window ${i + 1}`} />
                {rules.timeSlots.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11"
                    aria-label={`Remove arrival window ${i + 1}`}
                    onClick={() => setRules((r) => ({ ...r, timeSlots: r.timeSlots.filter((_, j) => j !== i) }))}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {rules.timeSlots.length < 12 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setRules((r) => ({ ...r, timeSlots: [...r.timeSlots, ""] }))}
            >
              <Plus /> Add window
            </Button>
          )}
        </div>
      </div>
      <SaveBar pending={pending} error={error} onSave={save} />
    </Card>
  );
}

/* Notifications ------------------------------------------------------------- */

function NotificationsTab({ notes, setNotes, businessEmail, toast }) {
  const { pending, error, run } = useSave(toast, "Notification settings saved");
  const setEmail = (k, v) => setNotes((n) => ({ ...n, emails: { ...n.emails, [k]: v } }));
  const save = () => run(() => saveNotifications(notes));
  return (
    <Card>
      <CardHeader
        title="Automatic customer emails"
        description="Emails you send yourself from a booking (updates, invoices, “pro assigned”) always go out."
      />
      <div className="divide-y divide-line border-b border-line">
        <Row label="Booking received" hint="When a customer books online.">
          <Switch
            checked={notes.emails.confirmation}
            onChange={(v) => setEmail("confirmation", v)}
            label="Booking received email"
          />
        </Row>
        <Row label="Booking cancelled" hint="When you cancel a booking.">
          <Switch
            checked={notes.emails.cancellation}
            onChange={(v) => setEmail("cancellation", v)}
            label="Booking cancelled email"
          />
        </Row>
      </div>
      <CardHeader title="Admin alerts" />
      <div className="divide-y divide-line border-b border-line">
        <Row label="Email me about new bookings" hint={`Sent to ${businessEmail || "the business email"}.`}>
          <Switch
            checked={notes.adminNewBooking}
            onChange={(v) => setNotes((n) => ({ ...n, adminNewBooking: v }))}
            label="New booking alerts"
          />
        </Row>
      </div>
      <CardHeader
        title="Provider job sheet"
        description="Filled in when you open “Send job sheet” on a booking. Variables: {booking_id} {service} {package} {date} {slot} {address} {access_notes} {provider_pay}"
      />
      <div className="px-5 pb-5">
        <Textarea
          className="min-h-36 font-mono text-sm"
          value={notes.jobSheetTemplate}
          onChange={(e) => setNotes((n) => ({ ...n, jobSheetTemplate: e.target.value }))}
          maxLength={1000}
          aria-label="Job sheet template"
        />
      </div>
      <SaveBar pending={pending} error={error} onSave={save} />
    </Card>
  );
}

/* Payments ------------------------------------------------------------------ */

function PaymentsTab({ invoiceDays, setInvoiceDays, toast }) {
  const { pending, error, run } = useSave(toast, "Payment settings saved");
  const save = () => run(() => savePaymentSettings({ invoiceDays: intOrNaN(invoiceDays) }));
  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-4 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-900">
          <CreditCard className="size-5" />
        </span>
        <div>
          <p className="font-semibold">Card payments aren’t switched on yet</p>
          <p className="mt-1 text-sm text-muted">
            Customers currently pay after the job, and you record payments on each booking. Online card payments will be set
            up here once you’ve chosen a provider.
          </p>
        </div>
      </Card>
      <Card>
        <div className="divide-y divide-line">
          <Row label="Invoice payment terms" hint="Shown on tax invoices and in your terms. 0 = due on receipt.">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={60}
                value={invoiceDays}
                onChange={(e) => setInvoiceDays(e.target.value)}
                className="w-28"
                aria-label="Invoice days"
              />
              <span className="w-12 text-sm text-muted">days</span>
            </div>
          </Row>
        </div>
        <SaveBar pending={pending} error={error} onSave={save} />
      </Card>
    </div>
  );
}

/* Team ---------------------------------------------------------------------- */

function TeamTab({ team, me, toast }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);
  const owner = me.teamRole === "Owner";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const add = () =>
    start(async () => {
      setError("");
      const res = await addAdmin(form);
      if (!res.ok) return setError(res.error);
      setForm(null);
      toast(res.created ? "Admin added — share their temporary password with them" : "Existing account is now an admin");
      router.refresh();
    });
  const changeRole = (u, role) =>
    start(async () => {
      const res = await setTeamRole(u.id, role);
      toast(res.ok ? `${u.name} is now ${role}` : res.error);
      router.refresh();
    });
  const remove = () =>
    start(async () => {
      const res = await removeAdmin(removing.id);
      setRemoving(null);
      toast(res.ok ? "Admin access removed" : res.error);
      router.refresh();
    });

  return (
    <Card>
      <CardHeader
        title="Admin team"
        description={
          owner
            ? "Everyone here has full access to the admin panel. Only Owners can change the team."
            : "Everyone here has full access to the admin panel. Ask an Owner to change the team."
        }
        action={
          owner && (
            <Button
              size="sm"
              onClick={() => {
                setError("");
                setForm({ name: "", email: "", teamRole: "Operations", password: "" });
              }}
            >
              <Plus /> Add admin
            </Button>
          )
        }
      />
      <ul className="divide-y divide-line">
        {team.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <Avatar name={u.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {u.name} {u.id === me.id && <span className="font-normal text-muted">(you)</span>}
              </p>
              <p className="truncate text-xs text-muted">{u.email}</p>
            </div>
            <span className="hidden w-32 text-right text-xs text-muted sm:block">
              {u.lastSeen ? `Active ${formatDate(u.lastSeen, { day: "numeric", month: "short" })}` : "Not signed in yet"}
            </span>
            {owner ? (
              <div className="flex items-center gap-1">
                <Select
                  value={u.teamRole}
                  onChange={(e) => changeRole(u, e.target.value)}
                  disabled={pending}
                  className="h-9 w-36"
                  aria-label={`${u.name}’s role`}
                >
                  {teamRoles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
                {u.id !== me.id && (
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(u)} aria-label={`Remove ${u.name}`}>
                    <UserMinus />
                  </Button>
                )}
              </div>
            ) : (
              <Badge tone={u.teamRole === "Owner" ? "success" : "neutral"}>{u.teamRole}</Badge>
            )}
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title="Add an admin"
        description="If they already have an account, it’s upgraded and they keep their password."
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={add} disabled={pending}>
              {pending ? "Adding…" : "Add admin"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="grid gap-4">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={set("email")} maxLength={255} autoFocus />
            </Field>
            <Field label="Name" hint="Only needed for a new account.">
              <Input value={form.name} onChange={set("name")} maxLength={120} />
            </Field>
            <Field label="Temporary password" hint="Only needed for a new account. At least 8 characters — ask them to change it.">
              <Input type="text" value={form.password} onChange={set("password")} maxLength={128} autoComplete="off" />
            </Field>
            <Field label="Role">
              <Select value={form.teamRole} onChange={set("teamRole")}>
                {teamRoles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.name ?? ""}?`}
        description="They’ll be signed out and lose access to the admin panel. Their account stays as a customer account."
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} disabled={pending}>
              Remove access
            </Button>
          </>
        }
      />
    </Card>
  );
}