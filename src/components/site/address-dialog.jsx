// src/components/site/address-dialog.jsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus } from "lucide-react";
import { deleteAddress, makeDefaultAddress, saveAddress } from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, useToast } from "@/components/ui/interactive";
import { useServerForm } from "@/components/ui/use-server-form";

/**
 * Add / edit address modal. `suburbs` come from the database; `address` is set when editing.
 * Renders its own trigger button unless `open`/`onClose` are controlled by the parent.
 */
export function AddressDialog({ suburbs = [], address = null, open: controlledOpen, onClose, onSaved }) {
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : innerOpen;
  const close = () => (controlled ? onClose?.() : setInnerOpen(false));
  const router = useRouter();
  const { pending, result, setResult, onSubmit, errors } = useServerForm(saveAddress, {
    onSuccess: () => {
      close();
      router.refresh();
      onSaved?.(address ? "Address updated" : "Address added");
    },
  });
  const formId = address ? `address-${address.id}` : "address-new";

  return (
    <>
      {!controlled && (
        <Button
          onClick={() => {
            setResult(null);
            setInnerOpen(true);
          }}
        >
          <Plus /> Add address
        </Button>
      )}
      <Modal
        open={open}
        onClose={close}
        title={address ? "Edit address" : "Add an address"}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={pending}>
              {pending ? "Saving…" : "Save address"}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          {address && <input type="hidden" name="id" value={address.id} />}
          {result?.error && <p className="text-sm text-danger sm:col-span-2">{result.error}</p>}
          <Field label="Label" htmlFor={`${formId}-label`} error={errors.label}>
            <Input
              id={`${formId}-label`}
              name="label"
              placeholder="Home, Work, Rental…"
              defaultValue={address?.label ?? ""}
              maxLength={40}
            />
          </Field>
          <Field label="Suburb" htmlFor={`${formId}-suburb`} error={errors.suburb}>
            <Select id={`${formId}-suburb`} name="suburb" defaultValue={address?.suburb ?? ""} required>
              <option value="">Select your suburb</option>
              {suburbs.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.postcode}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Street address" htmlFor={`${formId}-line1`} className="sm:col-span-2" error={errors.line1}>
            <Input
              id={`${formId}-line1`}
              name="line1"
              defaultValue={address?.line1 ?? ""}
              placeholder="e.g. 14 Pirie Street"
              autoComplete="street-address"
              required
              maxLength={200}
            />
          </Field>
          <Field label="Unit, building (optional)" htmlFor={`${formId}-line2`} className="sm:col-span-2" error={errors.line2}>
            <Input id={`${formId}-line2`} name="line2" defaultValue={address?.line2 ?? ""} maxLength={200} />
          </Field>
          <Field label="Access notes" htmlFor={`${formId}-notes`} className="sm:col-span-2" error={errors.notes}>
            <Textarea
              id={`${formId}-notes`}
              name="notes"
              defaultValue={address?.notes ?? ""}
              placeholder="Lockbox, parking, pets"
              maxLength={1000}
            />
          </Field>
          <Checkbox
            className="sm:col-span-2"
            name="isDefault"
            defaultChecked={address?.isDefault ?? false}
            label="Make this my default address"
          />
        </form>
      </Modal>
    </>
  );
}

/** The saved-addresses grid with edit / make default / remove. */
export function AddressList({ addresses = [], suburbs = [] }) {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [pending, start] = useTransition();

  const run = (fn, id, msg) =>
    start(async () => {
      const res = await fn(id);
      if (!res.ok) return toast(res.error);
      setRemoving(null);
      router.refresh();
      toast(msg);
    });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Addresses</h1>
          <p className="mt-1 text-muted">Saved addresses and access notes for faster booking.</p>
        </div>
        <AddressDialog suburbs={suburbs} onSaved={toast} />
      </div>

      {addresses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold">No saved addresses</p>
          <p className="mt-1 text-sm text-muted">Add one now, or it’ll be saved when you book.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{a.label}</p>
                    {a.isDefault && <Badge tone="success">Default</Badge>}
                  </div>
                  <p className="mt-1 text-[15px]">{a.line}</p>
                  {a.notes && <p className="mt-2 text-sm text-muted">{a.notes}</p>}
                </div>
              </div>
              <div className="mt-4 flex gap-4 border-t border-line pt-3 text-sm font-medium">
                <button className="text-ink-900" onClick={() => setEditing(a)} disabled={pending}>
                  Edit
                </button>
                {!a.isDefault && (
                  <button
                    className="text-muted hover:text-ink"
                    disabled={pending}
                    onClick={() => run(makeDefaultAddress, a.id, "Default address updated")}
                  >
                    Make default
                  </button>
                )}
                <button className="ml-auto text-danger" onClick={() => setRemoving(a)} disabled={pending}>
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <AddressDialog
          key={editing.id}
          suburbs={suburbs}
          address={editing}
          open
          onClose={() => setEditing(null)}
          onSaved={toast}
        />
      )}

      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Remove this address?"
        description={removing?.line}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => run(deleteAddress, removing.id, "Address removed")}>
              {pending ? "Removing…" : "Remove address"}
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-muted">Past bookings at this address aren’t affected.</p>
      </Modal>
      {toastNode}
    </>
  );
}