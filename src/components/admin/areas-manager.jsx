// src/components/admin/areas-manager.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { saveSuburb, saveZone, setZoneActive } from "@/server/actions/admin-catalog";
import { money } from "@/lib/utils";
import { Badge, Card, Table, Td, Th } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Modal, Switch, useToast } from "@/components/ui/interactive";

/** Zones and suburbs: travel fees, on/off switches, add and edit. */
export function AreasManager({ zones }) {
    const router = useRouter();
    const { toast, toastNode } = useToast();
    const [pending, start] = useTransition();
    const [zoneModal, setZoneModal] = useState(null); // { id?, name }
    const [suburbModal, setSuburbModal] = useState(null); // suburb form values
    const [error, setError] = useState("");

    const run = (fn, success, after) =>
        start(async () => {
            const res = await fn();
            if (!res.ok) {
                setError(res.error);
                toast(res.error);
                return;
            }
            setError("");
            after?.();
            toast(success);
            router.refresh();
        });

    const openSuburb = (s, zoneId) => {
        setError("");
        setSuburbModal(
            s
                ? {
                    id: s.id,
                    name: s.name,
                    postcode: s.postcode,
                    zoneId: String(zoneId),
                    surcharge: String(s.surcharge),
                    active: s.active,
                }
                : { name: "", postcode: "", zoneId: String(zoneId ?? zones[0]?.id ?? ""), surcharge: "0", active: true },
        );
    };

    return (
        <>
            <div className="mb-4 flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setError("") || setZoneModal({ name: "" })}>
                    Add zone
                </Button>
                <Button size="sm" onClick={() => openSuburb(null)} disabled={!zones.length}>
                    Add suburb
                </Button>
            </div>
            {zones.length === 0 && <Card className="p-8 text-center text-muted">Add a zone, then add suburbs to it.</Card>}
            <div className="grid gap-6 xl:grid-cols-2">
                {zones.map((z) => (
                    <Card key={z.id} className="min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                            <div className="min-w-0">
                                <h2 className="flex items-center gap-2 font-sans text-[15px] font-semibold tracking-normal">
                                    {z.name}
                                    {!z.active && <Badge tone="warn">Off</Badge>}
                                    <button
                                        className="rounded p-1 text-muted hover:text-ink"
                                        aria-label={`Rename ${z.name}`}
                                        onClick={() => setError("") || setZoneModal({ id: z.id, name: z.name })}
                                    >
                                        <Pencil className="size-3.5" />
                                    </button>
                                </h2>
                                <p className="text-xs text-muted">
                                    {z.suburbs.length} suburbs, {z.providers} active provider{z.providers === 1 ? "" : "s"}
                                    {z.providers === 0 && z.active && <span className="text-warn"> — nobody to send</span>}
                                </p>
                            </div>
                            <Switch
                                checked={z.active}
                                label={`${z.name} active`}
                                onChange={(v) => run(() => setZoneActive(z.id, v), v ? `${z.name} switched on` : `${z.name} switched off`)}
                            />
                        </div>
                        {z.suburbs.length ? (
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Suburb</Th>
                                        <Th>Postcode</Th>
                                        <Th>Travel fee</Th>
                                        <Th>Bookable</Th>
                                        <Th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {z.suburbs.map((s) => (
                                        <tr key={s.id} className={s.active ? "" : "text-muted"}>
                                            <Td className="font-medium">{s.name}</Td>
                                            <Td>{s.postcode}</Td>
                                            <Td>{s.surcharge ? money(s.surcharge) : "None"}</Td>
                                            <Td>
                                                <Switch
                                                    checked={s.active}
                                                    label={`${s.name} bookable`}
                                                    onChange={(v) =>
                                                        run(
                                                            () =>
                                                                saveSuburb({
                                                                    id: s.id,
                                                                    name: s.name,
                                                                    postcode: s.postcode,
                                                                    zoneId: z.id,
                                                                    surcharge: s.surcharge,
                                                                    active: v,
                                                                }),
                                                            v ? `${s.name} bookable` : `${s.name} switched off`,
                                                        )
                                                    }
                                                />
                                            </Td>
                                            <Td className="text-right">
                                                <button className="text-sm font-medium text-ink-900 hover:underline" onClick={() => openSuburb(s, z.id)}>
                                                    Edit
                                                </button>
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p className="px-5 py-6 text-sm text-muted">No suburbs yet.</p>
                        )}
                    </Card>
                ))}
            </div>

            <Modal
                open={Boolean(zoneModal)}
                onClose={() => setZoneModal(null)}
                title={zoneModal?.id ? "Rename zone" : "Add zone"}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setZoneModal(null)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={pending}
                            onClick={() =>
                                run(
                                    () => saveZone(zoneModal.id, zoneModal.name),
                                    zoneModal.id ? "Zone renamed" : "Zone added",
                                    () => setZoneModal(null),
                                )
                            }
                        >
                            Save
                        </Button>
                    </>
                }
            >
                <Field label="Zone name" htmlFor="zone-name" error={error}>
                    <Input
                        id="zone-name"
                        value={zoneModal?.name ?? ""}
                        maxLength={80}
                        onChange={(e) => setZoneModal((x) => ({ ...x, name: e.target.value }))}
                    />
                </Field>
                {zoneModal?.id && <p className="mt-2 text-xs text-muted">Providers and suburbs in this zone stay linked.</p>}
            </Modal>

            <Modal
                open={Boolean(suburbModal)}
                onClose={() => setSuburbModal(null)}
                title={suburbModal?.id ? `Edit ${suburbModal.name}` : "Add suburb"}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setSuburbModal(null)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={pending}
                            onClick={() =>
                                run(
                                    () =>
                                        saveSuburb({
                                            ...suburbModal,
                                            zoneId: Number(suburbModal.zoneId),
                                            surcharge: suburbModal.surcharge === "" ? 0 : suburbModal.surcharge,
                                        }),
                                    suburbModal.id ? "Suburb saved" : "Suburb added",
                                    () => setSuburbModal(null),
                                )
                            }
                        >
                            Save
                        </Button>
                    </>
                }
            >
                {suburbModal && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Suburb" htmlFor="sb-name">
                            <Input
                                id="sb-name"
                                value={suburbModal.name}
                                maxLength={80}
                                onChange={(e) => setSuburbModal((x) => ({ ...x, name: e.target.value }))}
                            />
                        </Field>
                        <Field label="Postcode" htmlFor="sb-postcode">
                            <Input
                                id="sb-postcode"
                                value={suburbModal.postcode}
                                inputMode="numeric"
                                maxLength={4}
                                onChange={(e) => setSuburbModal((x) => ({ ...x, postcode: e.target.value.replace(/\D/g, "") }))}
                            />
                        </Field>
                        <Field label="Zone" htmlFor="sb-zone">
                            <Select
                                id="sb-zone"
                                value={suburbModal.zoneId}
                                onChange={(e) => setSuburbModal((x) => ({ ...x, zoneId: e.target.value }))}
                            >
                                {zones.map((z) => (
                                    <option key={z.id} value={z.id}>
                                        {z.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Travel fee ($)" htmlFor="sb-fee" hint="Added to every booking here.">
                            <Input
                                id="sb-fee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={suburbModal.surcharge}
                                onChange={(e) => setSuburbModal((x) => ({ ...x, surcharge: e.target.value }))}
                            />
                        </Field>
                        <Checkbox
                            className="sm:col-span-2"
                            checked={suburbModal.active}
                            onChange={(e) => setSuburbModal((x) => ({ ...x, active: e.target.checked }))}
                            label="Customers can book here"
                        />
                        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
                    </div>
                )}
            </Modal>
            {toastNode}
        </>
    );
}