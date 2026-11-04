// src/lib/constants.js
/**
 * Fixed app vocabulary (not business data): status labels, badge tones and
 * the order of booking steps. These mirror the enums in src/db/schema.js.
 * Business data (services, prices, suburbs, settings…) lives in the database.
 */
export const bookingStatus = {
    new: { label: "Needs assigning", customerLabel: "Received", tone: "brand" },
    assigned: { label: "Assigned", customerLabel: "Pro assigned", tone: "info" },
    confirmed: { label: "Confirmed", customerLabel: "Confirmed", tone: "success" },
    in_progress: { label: "In progress", customerLabel: "In progress", tone: "info" },
    completed: { label: "Completed", customerLabel: "Completed", tone: "neutral" },
    cancelled: { label: "Cancelled", customerLabel: "Cancelled", tone: "danger" },
};

export const paymentStatus = {
    unpaid: { label: "Unpaid", tone: "warn" },
    partial: { label: "Deposit paid", tone: "info" },
    paid: { label: "Paid", tone: "success" },
    refunded: { label: "Refunded", tone: "neutral" },
};

export const providerStatus = {
    active: { label: "Active", tone: "success" },
    paused: { label: "Paused", tone: "warn" },
    onboarding: { label: "Onboarding", tone: "info" },
    inactive: { label: "Inactive", tone: "neutral" },
};

/** The customer-facing progress steps of a booking, in order. */
export const bookingSteps = ["new", "assigned", "confirmed", "in_progress", "completed"];

/** Service groups, in display order. A category's `group` must be one of these. */
export const serviceGroups = ["Cleaning", "Outdoor", "Repairs & trades", "Moving"];

export const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Enquiry types offered on the contact form. */
export const enquiryTypes = ["General", "Quote", "Booking", "Complaint", "Commercial"];

export const experienceOptions = ["Less than 1", "1–3", "3–5", "5+"];