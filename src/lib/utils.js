import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const aud = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const aud2 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
/** Format whole dollars, e.g. $149 */
export const money = (n) => aud.format(n);
/** Format with cents, e.g. $149.50 */
export const money2 = (n) => aud2.format(n);
export function formatDate(iso, opts = { weekday: "short", day: "numeric", month: "short" }) {
  return new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Hobart", ...opts });
}
export function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
/** GST is included in Australian consumer prices; this returns the GST component. */
export const gstComponent = (inclusive) => inclusive / 11;
