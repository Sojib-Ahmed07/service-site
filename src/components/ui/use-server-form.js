// src/components/ui/use-server-form.js
"use client";

import { useState, useTransition } from "react";

/**
 * Submits a <form> to a Server Action without React resetting the fields on error.
 *   const { pending, result, errors, onSubmit } = useServerForm(myAction);
 *   <form onSubmit={onSubmit}> … {errors.email} … {result?.error}
 * The action receives FormData and returns { ok, error?, fieldErrors? } (or redirects).
 * `onSuccess(result)` runs after an ok result.
 */
export function useServerForm(action, { onSuccess } = {}) {
    const [pending, start] = useTransition();
    const [result, setResult] = useState(null);
    const onSubmit = (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
            try {
                const res = await action(data);
                setResult(res ?? null);
                if (res?.ok) onSuccess?.(res);
            } catch (err) {
                // Redirects from the action are handled by Next.js; anything else is a real failure.
                if (String(err?.digest ?? "").startsWith("NEXT_REDIRECT")) return;
                setResult({ ok: false, error: "Something went wrong. Please try again." });
            }
        });
    };
    return { pending, result, setResult, onSubmit, errors: result?.fieldErrors ?? {} };
}