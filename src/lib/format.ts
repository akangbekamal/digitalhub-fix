export const CURRENCY = "GH₵";

export function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${CURRENCY}${n.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function effectivePrice(p: { price: number | string; discount_price?: number | string | null }) {
  const price = Number(p.price);
  const discount = p.discount_price === null || p.discount_price === undefined ? null : Number(p.discount_price);
  return discount !== null && discount > 0 && discount < price ? discount : price;
}

export const ORDER_STATUSES = [
  "placed",
  "payment_pending",
  "payment_confirmed",
  "processing",
  "ready",
  "completed",
  "cancelled",
  "refunded",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  placed: "Order placed",
  payment_pending: "Payment pending",
  payment_confirmed: "Payment confirmed",
  processing: "Processing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  submitted: "Submitted",
  verified: "Verified",
  failed: "Failed",
  refunded: "Refunded",
};

export function statusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (["completed", "verified", "payment_confirmed", "ready", "resolved", "approved"].includes(status)) return "success";
  if (["pending", "payment_pending", "submitted", "processing", "open", "requested", "in_progress"].includes(status))
    return "warning";
  if (["cancelled", "failed", "rejected"].includes(status)) return "danger";
  if (["refunded", "placed", "closed"].includes(status)) return "info";
  return "neutral";
}
