// src/components/admin/coupons-manager.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Tag } from "lucide-react";
import { saveCoupon, setCouponActive } from "@/server/actions/admin-catalog";
import { couponRestrictions } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { formatDate, money } from "@/lib/utils";
import { Badge, Card, EmptyState, Table, Td, Th } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal, Switch, useToast } from "@/components/ui/interactive";

const blank = {
  code: "",
  description: "",
  type: "percent",
  value: "",
  minSpend: "",
  usageLimit: "",
  expires: "",
  categoryId: "all",
  restriction: "anyone",
  active: true,
};

/** Hobart calendar date (YYYY-MM-DD) of an expiry instant. */
const expiryDate = (iso) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Hobart" }).format(new Date(iso)) : "");

/** Create, edit, pause and resume promo codes. `categories` = [{ id, name }]. */
export function CouponsManager({ coupons, categories }) {
  const router = useRouter();
  const { toast, toastNode } = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const today = todayISO();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const open = (c) => {
    setError("");
    setForm(
      c
        ? {
          id: c.id,
          code: c.code,
          description: c.description,
          type: c.type,
          value: String(c.value),
          minSpend: c.minSpend ? String(c.minSpend) : "",
          usageLimit: c.usageLimit ? String(c.usageLimit) : "",
          expires: expiryDate(c.expiresAt),
          categoryId: c.categoryIds?.length ? String(c.categoryIds[0]) : "all",
          restriction: c.restriction,
          active: c.active,
        }
        : blank,
    );
  };

  const save = () =>
    start(async () => {
      const res = await saveCoupon({
        ...form,
        minSpend: form.minSpend === "" ? 0 : form.minSpend,
        categoryId: form.categoryId,
      });
      if (!res.ok) return setError(res.error);
      setForm(null);
      toast(form.id ? "Promo code saved" : "Promo code created");
      router.refresh();
    });

  const toggle = (c, v) =>
    start(async () => {
      const res = await setCouponActive(c.id, v);
      toast(res.ok ? (v ? `${c.code} resumed` : `${c.code} paused`) : res.error);
      router.refresh();
    });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => open(null)}>
          Create code
        </Button>
      </div>
      <Card className="overflow-hidden">
        {coupons.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Rules</Th>
                <Th>Used</Th>
                <Th>Expires</Th>
                <Th>Status</Th>
                <Th>Active</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const ends = expiryDate(c.expiresAt);
                const usedUp = c.usageLimit && c.usedCount >= c.usageLimit;
                const expired = (ends && ends < today) || usedUp;
                const cat = c.categoryIds?.length ? categories.find((x) => x.id === c.categoryIds[0])?.name : null;
                return (
                  <tr key={c.id}>
                    <Td>
                      <span className="font-mono font-semibold">{c.code}</span>
                      {c.description && <span className="block text-xs text-muted">{c.description}</span>}
                    </Td>
                    <Td>{c.type === "percent" ? `${c.value}%` : money(c.value)}</Td>
                    <Td className="text-xs text-muted">
                      {c.minSpend ? `Min. ${money(c.minSpend)}` : "No minimum"}
                      <br />
                      {cat ?? "All services"}
                      {c.restriction !== "anyone" && (
                        <>
                          <br />
                          {couponRestrictions[c.restriction]}
                        </>
                      )}
                    </Td>
                    <Td>
                      {c.usedCount}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                      {c.usageLimit > 0 && (
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-paper">
                          <div
                            className="h-1.5 rounded-full bg-brand-500"
                            style={{ width: `${Math.min(100, (c.usedCount / c.usageLimit) * 100)}%` }}
                          />
                        </div>
                      )}
                    </Td>
                    <Td>{ends ? formatDate(c.expiresAt, { day: "numeric", month: "short", year: "numeric" }) : "Never"}</Td>
                    <Td>
                      {expired ? (
                        <Badge>{usedUp ? "Used up" : "Expired"}</Badge>
                      ) : c.active ? (
                        <Badge tone="success">Live</Badge>
                      ) : (
                        <Badge tone="warn">Paused</Badge>
                      )}
                    </Td>
                    <Td>
                      <Switch checked={c.active} label={`${c.code} active`} onChange={(v) => toggle(c, v)} />
                    </Td>
                    <Td className="text-right">
                      <button className="text-sm font-medium text-ink-900 hover:underline" onClick={() => open(c)}>
                        Edit
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<Tag />} title="No promo codes yet" />
        )}
      </Card>

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? `Edit ${form.code}` : "Create promo code"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : form?.id ? "Save changes" : "Create code"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" htmlFor="cp-code" hint="Letters and numbers. Customers type this at checkout.">
              <Input
                id="cp-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                placeholder="SUMMER20"
                maxLength={20}
                className="uppercase"
              />
            </Field>
            <Field label="Description" htmlFor="cp-desc" hint="Shown on the Offers page.">
              <Input id="cp-desc" value={form.description} onChange={set("description")} maxLength={200} />
            </Field>
            <Field label="Type" htmlFor="cp-type">
              <Select id="cp-type" value={form.type} onChange={set("type")}>
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
              </Select>
            </Field>
            <Field label={form.type === "percent" ? "Percent off" : "Dollars off"} htmlFor="cp-value">
              <Input id="cp-value" type="number" min="0" step="0.01" value={form.value} onChange={set("value")} />
            </Field>
            <Field label="Minimum spend ($)" htmlFor="cp-min" hint="Includes any travel fee.">
              <Input id="cp-min" type="number" min="0" step="0.01" value={form.minSpend} onChange={set("minSpend")} />
            </Field>
            <Field label="Usage limit" htmlFor="cp-limit" hint="Total uses. Leave blank for unlimited.">
              <Input id="cp-limit" type="number" min="1" step="1" value={form.usageLimit} onChange={set("usageLimit")} />
            </Field>
            <Field label="Last day it works" htmlFor="cp-expires" hint="Leave blank for no end date.">
              <Input id="cp-expires" type="date" value={form.expires} onChange={set("expires")} />
            </Field>
            <Field label="Applies to" htmlFor="cp-scope">
              <Select id="cp-scope" value={form.categoryId} onChange={set("categoryId")}>
                <option value="all">All services</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Who can use it" htmlFor="cp-who" className="sm:col-span-2">
              <Select id="cp-who" value={form.restriction} onChange={set("restriction")}>
                {Object.entries(couponRestrictions).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <Switch checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} label="Active" /> Active
              (customers can use it now)
            </label>
            {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          </div>
        )}
      </Modal>
      {toastNode}
    </>
  );
}