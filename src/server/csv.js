// src/server/csv.js
/** Builds a CSV download Response. Cells starting with = + - @ are escaped (spreadsheet formula injection). */
import "server-only";

function cell(v) {
    let s = v === null || v === undefined ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvResponse(filename, header, rows) {
    const body = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
    return new Response("﻿" + body, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}