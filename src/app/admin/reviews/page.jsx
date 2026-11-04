// src/app/admin/reviews/page.jsx
import { ReviewsManager } from "@/components/admin/reviews-manager";
import { AdminHeader } from "@/components/admin/ui";
import { getAllReviews } from "@/server/queries/admin";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const reviews = await getAllReviews();
  return (
    <>
      <AdminHeader
        title="Reviews"
        description="Customers review completed bookings. Publish the ones that should appear on the website."
      />
      <ReviewsManager reviews={reviews} />
    </>
  );
}