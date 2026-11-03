import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/misc";
import { Badge } from "@/components/ui/misc";
import { AddressDialog } from "@/components/site/address-dialog";

export const metadata = { title: "Addresses" };

const addresses = [
  { id: 1, label: "Home", line: "3 Grosvenor St, Sandy Bay TAS 7005", notes: "Side gate unlocked. Cat inside.", isDefault: true },
  { id: 2, label: "Rental", line: "12/4 Battery Square, Battery Point TAS 7004", notes: "Lockbox code 2210", isDefault: false },
];

export default function AddressesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Addresses</h1>
          <p className="mt-1 text-muted">Saved addresses and access notes for faster booking.</p>
        </div>
        <AddressDialog />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-5 text-brand-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{a.label}</p>
                  {a.isDefault && <Badge tone="success">Default</Badge>}
                </div>
                <p className="mt-1 text-[15px]">{a.line}</p>
                <p className="mt-2 text-sm text-muted">{a.notes}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-4 border-t border-line pt-3 text-sm font-medium">
              <button className="text-ink-900">Edit</button>
              {!a.isDefault && <button className="text-muted hover:text-ink">Make default</button>}
              <button className="ml-auto text-danger">Remove</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
