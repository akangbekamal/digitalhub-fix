/**
 * Message Center shared definitions (client-safe).
 * Templates and automation rules are stored as JSON in the existing
 * `store_settings` table under the `message_center` key — no duplicate backend.
 */

export type MessageTemplate = {
  key: string;
  label: string;
  subject: string;
  body: string;
  /** Automation trigger this template answers to, when it has one. */
  trigger?: string;
};

export const MESSAGE_VARIABLES = [
  "customer_name",
  "customer_email",
  "order_id",
  "product_name",
  "product_names",
  "amount",
  "currency",
  "payment_method",
  "payment_status",
  "order_status",
  "transaction_id",
  "download_link",
  "product_key",
  "support_ticket_id",
  "store_name",
  "store_email",
  "store_phone",
  "order_date",
] as const;

export type MessageVariable = (typeof MESSAGE_VARIABLES)[number];

const t = (
  key: string,
  label: string,
  subject: string,
  body: string,
  trigger?: string,
): MessageTemplate => ({ key, label, subject, body, ...(trigger ? { trigger } : {}) });

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  t("welcome", "Welcome", "Welcome to {{store_name}}", "Hi {{customer_name}},\n\nWelcome to {{store_name}}. Your account is ready — browse the catalog and check out in minutes.\n\n— {{store_name}}"),
  t("new_order", "New Order", "Order #{{order_id}} received", "Hi {{customer_name}},\n\nWe received your order #{{order_id}} for {{product_names}} totalling {{currency}}{{amount}} on {{order_date}}.\n\nWe will confirm your payment shortly.\n\n— {{store_name}}", "new_order"),
  t("payment_submitted", "Payment Submitted", "We received your payment details for #{{order_id}}", "Hi {{customer_name}},\n\nThanks — we received your {{payment_method}} payment details (reference {{transaction_id}}) for order #{{order_id}}. Verification usually takes a few minutes.\n\n— {{store_name}}", "payment_submitted"),
  t("payment_pending", "Payment Pending", "Payment still pending for #{{order_id}}", "Hi {{customer_name}},\n\nOrder #{{order_id}} is still awaiting payment of {{currency}}{{amount}}. Send the payment and submit your transaction ID to continue.\n\n— {{store_name}}"),
  t("payment_approved", "Payment Approved", "Payment approved for #{{order_id}}", "Hi {{customer_name}},\n\nYour payment of {{currency}}{{amount}} for order #{{order_id}} has been verified. We are processing your order now.\n\n— {{store_name}}", "payment_approved"),
  t("payment_rejected", "Payment Rejected", "Payment could not be verified for #{{order_id}}", "Hi {{customer_name}},\n\nWe could not verify the payment for order #{{order_id}}. Please check your transaction ID {{transaction_id}} and submit again.\n\n— {{store_name}}", "payment_rejected"),
  t("payment_failed", "Payment Failed", "Payment failed for #{{order_id}}", "Hi {{customer_name}},\n\nThe payment for order #{{order_id}} failed. No amount was captured — you can try again at any time.\n\n— {{store_name}}", "payment_failed"),
  t("order_processing", "Order Processing", "Order #{{order_id}} is being processed", "Hi {{customer_name}},\n\nOrder #{{order_id}} is now being processed. We will email you as soon as it is ready.\n\n— {{store_name}}"),
  t("order_completed", "Order Completed", "Order #{{order_id}} is complete", "Hi {{customer_name}},\n\nOrder #{{order_id}} is complete. Thank you for shopping with {{store_name}}.\n\n— {{store_name}}", "order_completed"),
  t("digital_delivered", "Digital Product Delivered", "Your {{product_name}} is ready", "Hi {{customer_name}},\n\nYour digital product for order #{{order_id}} is ready.\n\nProduct: {{product_name}}\nAccess: {{download_link}}\nKey: {{product_key}}\n\n— {{store_name}}", "digital_delivered"),
  t("order_cancelled", "Order Cancelled", "Order #{{order_id}} cancelled", "Hi {{customer_name}},\n\nOrder #{{order_id}} has been cancelled. Contact us on {{store_email}} if this was unexpected.\n\n— {{store_name}}", "order_cancelled"),
  t("refund_requested", "Refund Requested", "Refund request received for #{{order_id}}", "Hi {{customer_name}},\n\nWe received your refund request for order #{{order_id}} ({{currency}}{{amount}}) and are reviewing it.\n\n— {{store_name}}", "refund_requested"),
  t("refund_approved", "Refund Approved", "Refund approved for #{{order_id}}", "Hi {{customer_name}},\n\nYour refund of {{currency}}{{amount}} for order #{{order_id}} has been approved and is on its way back to you.\n\n— {{store_name}}", "refund_approved"),
  t("refund_rejected", "Refund Rejected", "Refund declined for #{{order_id}}", "Hi {{customer_name}},\n\nAfter review we could not approve the refund for order #{{order_id}}. Reply to this email if you would like to discuss it.\n\n— {{store_name}}"),
  t("support_received", "Support Ticket Received", "We received your message ({{support_ticket_id}})", "Hi {{customer_name}},\n\nThanks for contacting {{store_name}}. Ticket {{support_ticket_id}} is open and our team will reply shortly.\n\n— {{store_name}}", "support_created"),
  t("support_reply", "Support Ticket Reply", "Reply to your ticket {{support_ticket_id}}", "Hi {{customer_name}},\n\nOur support team replied to ticket {{support_ticket_id}}. Sign in to your dashboard to read the full response.\n\n— {{store_name}}"),
  t("low_inventory", "Low Inventory Alert", "Low stock: {{product_name}}", "Heads up — {{product_name}} is running low in {{store_name}} inventory. Restock soon to avoid failed deliveries.", "low_inventory"),
  t("new_review", "New Review", "New review for {{product_name}}", "A new customer review was submitted for {{product_name}} and is awaiting moderation."),
  t("promotional", "Promotional Message", "A little something from {{store_name}}", "Hi {{customer_name}},\n\nWe have new deals in store. Visit {{store_name}} today and grab yours.\n\n— {{store_name}}"),
];

export const TONES = [
  "Professional",
  "Friendly",
  "Short & Simple",
  "Thankful",
  "Apologetic",
  "Promotional",
] as const;
export type Tone = (typeof TONES)[number];

const TONE_OPENER: Record<Tone, string> = {
  Professional: "",
  Friendly: "Hope you're doing great! ",
  "Short & Simple": "",
  Thankful: "Thank you for choosing us. ",
  Apologetic: "We're sorry for the inconvenience. ",
  Promotional: "Good news! ",
};

/** Applies a tone without inventing content (no AI provider is configured). */
export function applyTone(body: string, tone: Tone): string {
  if (tone === "Short & Simple") {
    const lines = body.split("\n").filter(Boolean);
    return [lines[0] ?? "", ...lines.slice(1, 3)].join("\n\n");
  }
  const opener = TONE_OPENER[tone];
  if (!opener) return body;
  const [first, ...rest] = body.split("\n\n");
  return [first, opener + (rest[0] ?? ""), ...rest.slice(1)].filter(Boolean).join("\n\n");
}

export type MessageVars = Partial<Record<MessageVariable, string>> & Record<string, string | undefined>;

/** Replaces {{variable}} placeholders with real data. Unknown values become "—". */
export function renderTemplate(text: string, vars: MessageVars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, name: string) => {
    const v = vars[name];
    return v === undefined || v === "" ? "—" : v;
  });
}

export type AutomationRule = {
  trigger: string;
  label: string;
  templateKey: string;
  enabled: boolean;
};

export const DEFAULT_RULES: AutomationRule[] = [
  { trigger: "new_order", label: "New order placed", templateKey: "new_order", enabled: true },
  { trigger: "payment_submitted", label: "Payment submitted", templateKey: "payment_submitted", enabled: true },
  { trigger: "payment_approved", label: "Payment approved", templateKey: "payment_approved", enabled: true },
  { trigger: "payment_rejected", label: "Payment rejected", templateKey: "payment_rejected", enabled: true },
  { trigger: "digital_delivered", label: "Digital product delivered", templateKey: "digital_delivered", enabled: true },
  { trigger: "order_completed", label: "Order completed", templateKey: "order_completed", enabled: true },
  { trigger: "order_cancelled", label: "Order cancelled", templateKey: "order_cancelled", enabled: true },
  { trigger: "refund_requested", label: "Refund requested", templateKey: "refund_requested", enabled: true },
  { trigger: "low_inventory", label: "Inventory below threshold", templateKey: "low_inventory", enabled: true },
  { trigger: "support_created", label: "Support ticket created", templateKey: "support_received", enabled: true },
];

export type MessageCenterSettings = {
  templates: Record<string, { subject: string; body: string }>;
  rules: Record<string, boolean>;
};

export function mergeTemplates(settings: MessageCenterSettings | null): MessageTemplate[] {
  const overrides = settings?.templates ?? {};
  return DEFAULT_TEMPLATES.map((tpl) => {
    const o = overrides[tpl.key];
    return o ? { ...tpl, subject: o.subject, body: o.body } : tpl;
  });
}

export function mergeRules(settings: MessageCenterSettings | null): AutomationRule[] {
  const flags = settings?.rules ?? {};
  return DEFAULT_RULES.map((r) => ({ ...r, enabled: flags[r.trigger] !== false }));
}
