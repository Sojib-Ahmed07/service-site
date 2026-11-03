"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { suburbs } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/interactive";

export function AddressDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add address
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add an address"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Save address</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Label">
            <Input placeholder="Home, Work, Rental…" />
          </Field>
          <Field label="Suburb">
            <Select>
              {suburbs.map((s) => (
                <option key={s.name}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Street address" className="sm:col-span-2">
            <Input />
          </Field>
          <Field label="Access notes" className="sm:col-span-2">
            <Textarea placeholder="Lockbox, parking, pets" />
          </Field>
          <Checkbox className="sm:col-span-2" label="Make this my default address" />
        </div>
      </Modal>
    </>
  );
}
