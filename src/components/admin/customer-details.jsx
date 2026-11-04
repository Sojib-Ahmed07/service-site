// src/components/admin/customer-details.jsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { sendCustomerPasswordReset, setCustomerBlocked, updateCustomer } from "@/server/actions/admin-people";
import { Badge, Card, CardHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/interactive";
import { useServerForm } from "@/components/ui/use-server-form";

/** Edit a customer, send a password reset, block / unblock. */
export function CustomerDetails({ customer }) {
    const router = useRouter();
    const { toast, toastNode } = useToast();
    const [pending, start] = useTransition();
    const save = (fd) => updateCustomer(customer.id, fd);
    const form = useServerForm(save, {
        onSuccess: (r) => {
            toast(r.message);
            router.refresh();
        },
    });
    const act = (fn) =>
        start(async () => {
            const res = await fn();
            toast(res.ok ? res.message : res.error);
            if (res.ok) router.refresh();
        });
    const blocked = customer.status === "blocked";

    return (
        <Card>
            <CardHeader
                title="Details"
                action={blocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}
            />
            <form onSubmit={form.onSubmit} className="space-y-4 p-5">
                {form.result?.error && <p className="text-sm text-danger">{form.result.error}</p>}
                <Field label="Name" htmlFor="cu-name" error={form.errors.name}>
                    <Input id="cu-name" name="name" defaultValue={customer.name} required maxLength={120} />
                </Field>
                <Field label="Email" htmlFor="cu-email" error={form.errors.email}>
                    <Input id="cu-email" name="email" type="email" defaultValue={customer.email} required maxLength={255} />
                </Field>
                <Field label="Mobile" htmlFor="cu-phone" error={form.errors.phone}>
                    <Input id="cu-phone" name="phone" type="tel" defaultValue={customer.phone} maxLength={32} />
                </Field>
                <Field label="Internal notes" htmlFor="cu-notes" hint="Only admins see these.">
                    <Textarea
                        id="cu-notes"
                        name="adminNotes"
                        defaultValue={customer.adminNotes}
                        placeholder="e.g. Prefers morning bookings"
                        maxLength={5000}
                    />
                </Field>
                <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={form.pending}>
                        {form.pending ? "Saving…" : "Save"}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending || blocked}
                        onClick={() => act(() => sendCustomerPasswordReset(customer.id))}
                    >
                        Send password reset
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={blocked ? "" : "text-danger"}
                        disabled={pending}
                        onClick={() => act(() => setCustomerBlocked(customer.id, !blocked))}
                    >
                        {blocked ? "Unblock" : "Block customer"}
                    </Button>
                </div>
            </form>
            {toastNode}
        </Card>
    );
}