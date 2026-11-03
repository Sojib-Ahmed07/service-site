"use client";

import { useState } from "react";
import { categories, coupons as seed } from "@/lib/data";
import { formatDate, money } from "@/lib/utils";
import { Badge, Card, Table, Td, Th } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal, Switch, useToast } from "@/components/ui/interactive";

export function CouponsManager() {
  const [list, setList] = useState(seed);
  const [open, setOpen] = useState(false);
  const { toast, toastNode } = useToast();

  const create = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setList((x) => [
      {
        code: String(f.get("code")).toUpperCase(),
        type: f.get("type"),
        value: Number(f.get("value")),
        minSpend: Number(f.get("minSpend") || 0),
        uses: 0,
        limit: Number(f.get("limit") || 0),
        expires: f.get("expires") || "2027-12-31",
        active: true,
        description: f.get("description"),
      },
      ...x,
    ]);
    setOpen(false);
    toast("Promo code created");
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          Create code
        </Button>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Min. spend</Th>
              <Th>Used</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
              <Th>Active</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => {
              const expired = c.expires < "2026-11-03" || (c.limit && c.uses >= c.limit);
              return (
                <tr key={c.code}>
                  <Td>
                    <span className="font-mono font-semibold">{c.code}</span>
                    <span className="block text-xs text-muted">{c.description}</span>
                  </Td>
                  <Td>{c.type === "percent" ? `${c.value}%` : money(c.value)}</Td>
                  <Td>{c.minSpend ? money(c.minSpend) : "None"}</Td>
                  <Td>
                    {c.uses}
                    {c.limit ? ` / ${c.limit}` : ""}
                    {c.limit > 0 && (
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-paper">
                        <div
                          className="h-1.5 rounded-full bg-brand-500"
                          style={{ width: `${Math.min(100, (c.uses / c.limit) * 100)}%` }}
                        />
                      </div>
                    )}
                  </Td>
                  <Td>{formatDate(c.expires, { day: "numeric", month: "short", year: "numeric" })}</Td>
                  <Td>
                    {expired ? (
                      <Badge>Expired</Badge>
                    ) : c.active ? (
                      <Badge tone="success">Live</Badge>
                    ) : (
                      <Badge tone="warn">Paused</Badge>
                    )}
                  </Td>
                  <Td>
                    <Switch defaultChecked={c.active && !expired} label={`${c.code} active`} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create promo code" size="lg">
        <form id="coupon-form" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <Field label="Code">
            <Input name="code" required placeholder="SUMMER20" className="uppercase" />
          </Field>
          <Field label="Description (internal)">
            <Input name="description" />
          </Field>
          <Field label="Type">
            <Select name="type">
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </Select>
          </Field>
          <Field label="Value">
            <Input name="value" type="number" required />
          </Field>
          <Field label="Minimum spend ($)">
            <Input name="minSpend" type="number" />
          </Field>
          <Field label="Usage limit" hint="Leave blank for unlimited.">
            <Input name="limit" type="number" />
          </Field>
          <Field label="Expires">
            <Input name="expires" type="date" />
          </Field>
          <Field label="Applies to">
            <Select name="scope">
              <option>All services</option>
              {categories.map((c) => (
                <option key={c.slug}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Customer restriction" className="sm:col-span-2">
            <Select name="who">
              <option>Anyone</option>
              <option>First booking only</option>
              <option>One use per customer</option>
            </Select>
          </Field>
          <Field
            label="Banner text (optional)"
            className="sm:col-span-2"
            hint="Shown in the top bar if you publish it as a banner in CMS."
          >
            <Textarea name="banner" className="min-h-16" />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create code</Button>
          </div>
        </form>
      </Modal>
      {toastNode}
    </>
  );
}
