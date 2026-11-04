// src/app/(site)/account/addresses/page.jsx
import { AddressList } from "@/components/site/address-dialog";
import { requireUser } from "@/server/session";
import { getMyAddresses } from "@/server/queries/account";
import { getAreas } from "@/server/queries/catalog";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const [addresses, { suburbs }] = await Promise.all([getMyAddresses(user.id), getAreas()]);
  return (
    <div className="space-y-6">
      <AddressList addresses={addresses} suburbs={suburbs} />
    </div>
  );
}