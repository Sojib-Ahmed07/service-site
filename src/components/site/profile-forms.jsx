// src/components/site/profile-forms.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, deleteAccount, updateNotificationPref, updateProfile } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/misc";
import { Field, Input } from "@/components/ui/form";
import { Modal, Switch, useToast } from "@/components/ui/interactive";
import { useServerForm } from "@/components/ui/use-server-form";

/** Everything on Account › Profile & security. `user` comes from getCurrentUser(). */
export function ProfileForms({ user }) {
    const router = useRouter();
    const { toast, toastNode } = useToast();
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-semibold">Profile & security</h1>
            <DetailsCard
                user={user}
                onSaved={(m) => {
                    toast(m);
                    router.refresh();
                }}
            />
            <NotificationsCard user={user} toast={toast} />
            <PasswordCard toast={toast} />
            {user.role !== "admin" && <DeleteCard />}
            {toastNode}
        </div>
    );
}

function DetailsCard({ user, onSaved }) {
    const { pending, result, onSubmit, errors } = useServerForm(updateProfile, { onSuccess: (r) => onSaved(r.message) });
    return (
        <Card>
            <CardHeader title="Personal details" />
            <form onSubmit={onSubmit} className="grid gap-5 p-5 sm:grid-cols-2">
                {result?.error && <p className="text-sm text-danger sm:col-span-2">{result.error}</p>}
                <Field label="Full name" htmlFor="p-name" error={errors.name}>
                    <Input id="p-name" name="name" defaultValue={user.name} required maxLength={120} autoComplete="name" />
                </Field>
                <Field label="Mobile" htmlFor="p-phone" error={errors.phone}>
                    <Input id="p-phone" name="phone" type="tel" defaultValue={user.phone} maxLength={32} autoComplete="tel" />
                </Field>
                <Field
                    label="Email"
                    htmlFor="p-email"
                    className="sm:col-span-2"
                    hint="To change your email address, contact us and we’ll update it for you."
                >
                    <Input id="p-email" defaultValue={user.email} type="email" disabled />
                </Field>
                <div className="sm:col-span-2">
                    <Button type="submit" disabled={pending}>
                        {pending ? "Saving…" : "Save changes"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

const prefs = [
    { key: "notifySms", label: "Booking updates by SMS", hint: "Reminders and arrival updates by text, once we switch texts on." },
    {
        key: "notifyEmail",
        label: "Booking updates by email",
        hint: "Day-before reminders and review requests. Receipts and changes to your booking are always emailed.",
    },
    { key: "marketingOptIn", label: "Seasonal reminders and offers", hint: "A few emails a year. Unsubscribe any time." },
];

function NotificationsCard({ user, toast }) {
    const [values, setValues] = useState({
        notifySms: user.notifySms,
        notifyEmail: user.notifyEmail,
        marketingOptIn: user.marketingOptIn,
    });
    const change = async (key, value) => {
        setValues((v) => ({ ...v, [key]: value })); // update straight away, roll back on failure
        const res = await updateNotificationPref(key, value);
        if (!res.ok) {
            setValues((v) => ({ ...v, [key]: !value }));
            toast(res.error);
        } else toast("Saved");
    };
    return (
        <Card>
            <CardHeader title="Notifications" />
            <ul className="divide-y divide-line">
                {prefs.map((p) => (
                    <li key={p.key} className="flex items-center justify-between gap-6 px-5 py-4">
                        <div>
                            <p className="font-medium">{p.label}</p>
                            <p className="text-sm text-muted">{p.hint}</p>
                        </div>
                        <Switch checked={values[p.key]} onChange={(v) => change(p.key, v)} label={p.label} />
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function PasswordCard({ toast }) {
    const [formKey, setFormKey] = useState(0);
    const { pending, result, onSubmit, errors } = useServerForm(changePassword, {
        onSuccess: (r) => {
            toast(r.message);
            setFormKey((k) => k + 1); // clears the password fields
        },
    });
    return (
        <Card>
            <CardHeader title="Password" />
            <form key={formKey} onSubmit={onSubmit} className="grid gap-5 p-5 sm:grid-cols-2">
                {result?.error && <p className="text-sm text-danger sm:col-span-2">{result.error}</p>}
                <Field label="Current password" htmlFor="pw-current" className="sm:col-span-2" error={errors.currentPassword}>
                    <Input id="pw-current" name="currentPassword" type="password" autoComplete="current-password" maxLength={128} />
                </Field>
                <Field label="New password" htmlFor="pw-new" hint="At least 8 characters." error={errors.newPassword}>
                    <Input id="pw-new" name="newPassword" type="password" autoComplete="new-password" maxLength={128} />
                </Field>
                <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirm}>
                    <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" maxLength={128} />
                </Field>
                <div className="sm:col-span-2">
                    <Button type="submit" variant="outline" disabled={pending}>
                        {pending ? "Updating…" : "Update password"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

function DeleteCard() {
    const [open, setOpen] = useState(false);
    const { pending, result, setResult, onSubmit, errors } = useServerForm(deleteAccount);
    return (
        <Card className="border-danger/30">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="font-semibold">Delete account</p>
                    <p className="text-sm text-muted">
                        Removes your profile and saved addresses. Tax invoices are kept for 5 years as required by law.
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="border-danger/40 text-danger hover:border-danger hover:bg-danger-50"
                    onClick={() => {
                        setResult(null);
                        setOpen(true);
                    }}
                >
                    Delete account
                </Button>
            </div>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Delete your account?"
                description="This can’t be undone. You’ll be logged out straight away."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Keep my account
                        </Button>
                        <Button type="submit" form="delete-account" variant="danger" disabled={pending}>
                            {pending ? "Deleting…" : "Delete account"}
                        </Button>
                    </>
                }
            >
                <form id="delete-account" onSubmit={onSubmit} className="space-y-3">
                    {result?.error && <p className="text-sm text-danger">{result.error}</p>}
                    <Field label="Type DELETE to confirm" htmlFor="del-confirm" error={errors.confirm}>
                        <Input id="del-confirm" name="confirm" autoComplete="off" />
                    </Field>
                </form>
            </Modal>
        </Card>
    );
}