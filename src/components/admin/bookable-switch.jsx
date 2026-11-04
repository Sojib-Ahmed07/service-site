// src/components/admin/bookable-switch.jsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Switch, useToast } from "@/components/ui/interactive";

/** A switch that calls a Server Action (fn(id, value)) and rolls back if it fails. */
export function ActionSwitch({ id, initial, action, label, onMessage, offMessage }) {
    const router = useRouter();
    const [on, setOn] = useState(initial);
    const [, start] = useTransition();
    const { toast, toastNode } = useToast();
    return (
        <>
            <Switch
                checked={on}
                label={label}
                onChange={(v) => {
                    setOn(v);
                    start(async () => {
                        const res = await action(id, v);
                        if (!res.ok) {
                            setOn(!v);
                            return toast(res.error);
                        }
                        toast(v ? onMessage : offMessage);
                        router.refresh();
                    });
                }}
            />
            {toastNode}
        </>
    );
}