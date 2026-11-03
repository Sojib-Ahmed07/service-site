import { demoUser } from "@/lib/data";
import { Card, CardHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Switch } from "@/components/ui/interactive";

export const metadata = { title: "Profile & security" };

export default function ProfilePage() {
  const prefs = [
    { label: "Booking updates by SMS", hint: "Assignment, reminders and arrival updates.", on: true },
    { label: "Booking updates by email", hint: "Confirmations, receipts and invoices.", on: true },
    { label: "Seasonal reminders and offers", hint: "A few emails a year. Unsubscribe any time.", on: false },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Profile & security</h1>

      <Card>
        <CardHeader title="Personal details" />
        <form className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Full name">
            <Input defaultValue={demoUser.name} />
          </Field>
          <Field label="Mobile">
            <Input defaultValue={demoUser.phone} />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <Input defaultValue={demoUser.email} type="email" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="button">Save changes</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Notifications" />
        <ul className="divide-y divide-line">
          {prefs.map((p) => (
            <li key={p.label} className="flex items-center justify-between gap-6 px-5 py-4">
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-sm text-muted">{p.hint}</p>
              </div>
              <Switch defaultChecked={p.on} label={p.label} />
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Password" />
        <form className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Current password" className="sm:col-span-2">
            <Input type="password" autoComplete="current-password" />
          </Field>
          <Field label="New password">
            <Input type="password" autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" autoComplete="new-password" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="button" variant="outline">
              Update password
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-danger/30">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Delete account</p>
            <p className="text-sm text-muted">
              Removes your profile and saved addresses. Tax invoices are kept for 5 years as required by law.
            </p>
          </div>
          <Button variant="outline" className="border-danger/40 text-danger hover:border-danger hover:bg-danger-50">
            Delete account
          </Button>
        </div>
      </Card>
    </div>
  );
}
