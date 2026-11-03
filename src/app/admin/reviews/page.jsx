import { ReviewsManager } from "@/components/admin/reviews-manager";
import { AdminHeader } from "@/components/admin/ui";

export const metadata = { title: "Reviews" };

export default function ReviewsPage() {
  return (
    <>
      <AdminHeader
        title="Reviews"
        description="Customers review completed bookings. Publish the ones that should appear on the website."
      />
      <ReviewsManager />
    </>
  );
}
