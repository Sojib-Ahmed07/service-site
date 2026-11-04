// src/app/admin/payments/export/route.js
/**
 * GET /admin/payments/export → every recorded payment and refund as CSV (admins only).
 * Columns suit Xero's bank statement import: Date, Amount, Payee, Description, Reference.
 */
import { todayISO } from "@/lib/dates";
import { csvResponse } from "@/server/csv";
import { getPaymentLedger } from "@/server/queries/admin-catalog";
import { getAdmin } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
    if (!(await getAdmin())) return new Response("Forbidden", { status: 403 });
    const rows = await getPaymentLedger();
    const date = (d) => new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Hobart" }).format(d); // DD/MM/YYYY
    return csvResponse(
        `payments-${todayISO()}.csv`,
        ["Date", "Amount", "Payee", "Description", "Reference", "GST included", "Method"],
        rows.map((r) => {
            const amount = Number(r.amount) * (r.status === "refunded" ? -1 : 1);
            return [
                date(r.at),
                amount.toFixed(2),
                r.customer,
                r.status === "refunded" ? `Refund for ${r.reference}` : `Payment for ${r.reference}`,
                r.reference,
                (amount / 11).toFixed(2),
                r.method,
            ];
        }),
    );
}