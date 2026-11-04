// src/components/admin/pager.jsx
"use client";

/** "Showing 1–50 of 230" with Previous / Next for server-paged admin lists. */
export function Pager({ page, pages, total, pageSize = 50, onPage }) {
    const from = total ? (page - 1) * pageSize + 1 : 0;
    const to = Math.min(total, page * pageSize);
    return (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
            <span>
                Showing {from}–{to} of {total}
            </span>
            <div className="flex gap-1">
                <button
                    className="rounded-lg border border-line px-3 py-1 hover:bg-paper disabled:opacity-40"
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                >
                    Previous
                </button>
                <button
                    className="rounded-lg border border-line px-3 py-1 hover:bg-paper disabled:opacity-40"
                    disabled={page >= pages}
                    onClick={() => onPage(page + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}