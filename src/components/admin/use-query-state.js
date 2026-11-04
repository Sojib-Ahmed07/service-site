// src/components/admin/use-query-state.js
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * Keeps list filters in the URL (?status=new&page=2) so the server can filter and page,
 * and so filtered views can be bookmarked. Changing any filter resets to page 1.
 *   const { set, pending } = useQueryState();  set({ status: "new" })
 */
export function useQueryState() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const [pending, start] = useTransition();
    const set = (patch, { keepPage = false } = {}) => {
        const next = new URLSearchParams(params.toString());
        for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === "" || v === "all") next.delete(k);
            else next.set(k, String(v));
        }
        if (!keepPage && !("page" in patch)) next.delete("page");
        const qs = next.toString();
        start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    };
    return { set, pending };
}

/** A search box value that updates the URL 300ms after typing stops. */
export function useDebouncedSearch(initial, onChange) {
    const [value, setValue] = useState(initial);
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(() => onChange(value.trim()), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    return [value, setValue];
}