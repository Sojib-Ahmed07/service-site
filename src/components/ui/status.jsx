// src/components/ui/status.jsx
import { Badge } from "@/components/ui/misc";
import { bookingStatus, paymentStatus, providerStatus } from "@/lib/constants";

export function BookingBadge({ status, customer }) {
  const s = bookingStatus[status];
  return (
    <Badge tone={s.tone} dot>
      {customer ? s.customerLabel : s.label}
    </Badge>
  );
}

export function PaymentBadge({ status }) {
  const s = paymentStatus[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function ProviderBadge({ status }) {
  const s = providerStatus[status];
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}