import { providers, suburbs, zones } from "@/lib/data";
import { AdminHeader } from "@/components/admin/ui";
import { Card, Table, Td, Th } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Switch } from "@/components/ui/interactive";

export const metadata = { title: "Service areas" };

export default function AreasAdminPage() {
  return (
    <>
      <AdminHeader
        title="Service areas"
        description="Zones group suburbs for provider matching. Set a travel fee per suburb, or switch a suburb off to stop bookings there."
        actions={
          <>
            <Button variant="outline" size="sm">
              Add zone
            </Button>
            <Button size="sm">Add suburb</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {zones.map((z) => {
          const list = suburbs.filter((s) => s.zone === z);
          const pros = providers.filter((p) => p.zones.includes(z) && p.status === "active").length;
          return (
            <Card key={z} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <div>
                  <h2 className="font-sans text-[15px] font-semibold tracking-normal">{z}</h2>
                  <p className="text-xs text-muted">
                    {list.length} suburbs, {pros} active providers
                  </p>
                </div>
                <Switch defaultChecked label={`${z} active`} />
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Suburb</Th>
                    <Th>Postcode</Th>
                    <Th>Travel fee ($)</Th>
                    <Th>Bookable</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.name}>
                      <Td className="font-medium">{s.name}</Td>
                      <Td>{s.postcode}</Td>
                      <Td>
                        <Input
                          type="number"
                          defaultValue={s.surcharge ?? 0}
                          className="h-8 w-24 text-sm"
                          aria-label={`${s.name} travel fee`}
                        />
                      </Td>
                      <Td>
                        <Switch defaultChecked label={`${s.name} bookable`} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          );
        })}
      </div>
    </>
  );
}
