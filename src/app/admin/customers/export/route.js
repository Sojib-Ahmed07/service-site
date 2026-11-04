// src/app/admin/customers/export/route.js
/** GET /admin/customers/export → CSV of customers (admins only). */
import { todayISO } from "@/lib/dates";
import { csvResponse } from "@/server/csv";
import { listCustomers } from "@/server/queries/admin";
import { getAdmin } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request) {
    if (!(await getAdmin())) return new Response("Forbidden", { status: 403 });
    const sp = new URL(request.url).searchParams;
    const filters = { q: (sp.get("q") || "").slice(0, 100), zone: sp.get("zone") || "all", sort: sp.get("sort") || "spent" };
    const rows = [];
    for (let page = 1; page <= 200; page++) {
        const data = await listCustomers({ ...filters, page });
        rows.push(...data.rows);
        if (page >= data.pages) break;
    }
    return csvResponse(
        `customers-${todayISO()}.csv`,
        ["Name", "Email", "Phone", "Suburb", "Bookings", "Paid (AUD)", "Joined", "Status"],
        rows.map((c) => [c.name, c.email, c.phone, c.suburb, c.bookings, c.spent.toFixed(2), c.joined.slice(0, 10), c.status]),
    );
}