// src/app/admin/customers/page.jsx
import { CustomersTable } from "@/components/admin/customers-table";
import { AdminHeader } from "@/components/admin/ui";
import { getAdminOptions, listCustomers } from "@/server/queries/admin";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }) {
  const sp = await searchParams;
  const filters = {
    q: typeof sp.q === "string" ? sp.q.slice(0, 100) : "",
    zone: typeof sp.zone === "string" && sp.zone ? sp.zone : "all",
    sort: ["bookings", "joined"].includes(sp.sort) ? sp.sort : "spent",
    page: Number(sp.page) || 1,
  };
  const [data, options] = await Promise.all([listCustomers(filters), getAdminOptions()]);
  const exportQs = new URLSearchParams(
    Object.entries(filters).filter(([k, v]) => k !== "page" && v && v !== "all" && v !== "spent"),
  ).toString();
  return (
    <>
      <AdminHeader
        title="Customers"
        description="Everyone who has booked or created an account."
        actions={
          <a
            href={`/admin/customers/export${exportQs ? `?${exportQs}` : ""}`}
            className="inline-flex h-9 items-center rounded-[10px] border border-line-strong bg-surface px-3.5 text-sm font-semibold hover:bg-paper"
          >
            Export CSV
          </a>
        }
      />
      <CustomersTable data={data} filters={filters} zones={options.zones} />
    </>
  );
}