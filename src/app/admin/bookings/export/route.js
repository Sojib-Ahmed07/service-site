// src/app/admin/bookings/export/route.js
/** GET /admin/bookings/export?status=…&q=… → CSV of the filtered bookings (admins only). */
import { bookingStatus, paymentStatus } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import { csvResponse } from "@/server/csv";
import { listBookings } from "@/server/queries/admin";
import { getAdmin } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request) {
    if (!(await getAdmin())) return new Response("Forbidden", { status: 403 });
    const sp = new URL(request.url).searchParams;
    const filters = {
        status: sp.get("status") in bookingStatus ? sp.get("status") : "all",
        category: sp.get("category") || "all",
        zone: sp.get("zone") || "all",
        q: (sp.get("q") || "").slice(0, 100),
        sort: sp.get("sort") || "date",
    };
    const rows = [];
    for (let page = 1; page <= 200; page++) {
        const data = await listBookings({ ...filters, page });
        rows.push(...data.rows);
        if (page >= data.pages) break;
    }
    return csvResponse(
        `bookings-${todayISO()}.csv`,
        [
            "Booking",
            "Job date",
            "Window",
            "Service",
            "Customer",
            "Suburb",
            "Zone",
            "Provider",
            "Status",
            "Payment",
            "Total (AUD)",
            "Booked at",
        ],
        rows.map((b) => [
            b.id,
            b.date,
            b.slot,
            b.categoryName,
            b.customerName,
            b.suburb,
            b.zone,
            b.providerName ?? "",
            bookingStatus[b.status].label,
            paymentStatus[b.payment].label,
            b.total.toFixed(2),
            b.createdAt,
        ]),
    );
}