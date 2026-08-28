import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Sends an admin alert to Telegram. Requires the TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID secrets. When they are absent the call is a no-op so the
 * store keeps working without Telegram configured.
 */
export async function telegramAlert(message: string): Promise<void> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch (error) {
    console.error("telegram alert failed", error);
  }
}

export type AdminNotifySettings = {
  website_enabled: boolean;
  email_enabled: boolean;
  email_address: string;
};

const ADMIN_NOTIFY_DEFAULTS: AdminNotifySettings = {
  website_enabled: true,
  email_enabled: false,
  email_address: "",
};

/** Private admin notification config. Never exposed to customers (RLS hides the `admin_notify` key). */
export async function getAdminNotifySettings(): Promise<AdminNotifySettings> {
  try {
    const { data } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "admin_notify")
      .maybeSingle();
    const value = (data?.value ?? {}) as Partial<AdminNotifySettings>;
    return {
      website_enabled: value.website_enabled !== false,
      email_enabled: value.email_enabled === true,
      email_address: String(value.email_address ?? "").trim(),
    };
  } catch {
    return ADMIN_NOTIFY_DEFAULTS;
  }
}

/** True when the existing Brevo server secrets are present. */
export function emailConfigured(): boolean {
  return Boolean(process.env["BREVO_API_KEY"] && process.env["BREVO_FROM_EMAIL"]);
}

/** Metadata recorded in the Message Center history for every email attempt. */
export type MessageLogMeta = {
  message_type: string;
  template_key?: string | null;
  customer_id?: string | null;
  order_id?: string | null;
  /** "automated" (event driven) or "manual" (Message Generator). */
  source?: "automated" | "manual";
  sent_by?: string | null;
  /** Unique key that stops the same automated message being logged/sent twice. */
  dedupe_key?: string | null;
};

/** Writes one Message Center history row. Never throws. */
export async function logMessage(
  meta: MessageLogMeta,
  entry: { recipient: string; subject: string; body: string; status: "sent" | "failed" | "draft" | "queued" | "cancelled"; error?: string | null },
): Promise<void> {
  try {
    await supabaseAdmin.from("message_logs").insert({
      message_type: meta.message_type,
      template_key: meta.template_key ?? null,
      channel: "email",
      recipient: entry.recipient,
      customer_id: meta.customer_id ?? null,
      order_id: meta.order_id ?? null,
      subject: entry.subject,
      body: entry.body,
      status: entry.status,
      error: entry.error ?? null,
      sent_by: meta.sent_by ?? null,
      source: meta.source ?? "automated",
      dedupe_key: meta.dedupe_key ?? null,
    });
  } catch (error) {
    console.error("logMessage failed", error);
  }
}

/** True when this exact automated message was already logged (duplicate guard). */
export async function alreadySent(dedupeKey: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("message_logs")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .eq("status", "sent")
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

/** Message Center templates/automation flags, stored in the existing store_settings table. */
export async function getMessageCenterSettings(): Promise<{
  templates: Record<string, { subject: string; body: string }>;
  rules: Record<string, boolean>;
}> {
  try {
    const { data } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "message_center")
      .maybeSingle();
    const value = (data?.value ?? {}) as { templates?: Record<string, { subject: string; body: string }>; rules?: Record<string, boolean> };
    return { templates: value.templates ?? {}, rules: value.rules ?? {} };
  } catch {
    return { templates: {}, rules: {} };
  }
}

/** Automation rules default to ON; only an explicit `false` disables one. */
export async function automationEnabled(trigger: string): Promise<boolean> {
  const settings = await getMessageCenterSettings();
  return settings.rules[trigger] !== false;
}

/** Sends an email through the existing Brevo integration. Never throws. */
export async function sendBrevoEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  log?: MessageLogMeta;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env["BREVO_API_KEY"];
  const from = process.env["BREVO_FROM_EMAIL"];
  const record = async (status: "sent" | "failed", error?: string) => {
    if (input.log) {
      await logMessage(input.log, {
        recipient: input.to,
        subject: input.subject,
        body: input.text ?? input.html,
        status,
        error: error ?? null,
      });
    }
  };
  if (!apiKey || !from) {
    const error = "Email provider is not configured. Add BREVO_API_KEY and BREVO_FROM_EMAIL.";
    await record("failed", error);
    return { ok: false, error };
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { name: "DigitalHub Ghana", email: from },
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
        ...(input.text ? { textContent: input.text } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Brevo email failed", res.status, detail);
      const error = `Email provider error (${res.status}).`;
      await record("failed", error);
      return { ok: false, error };
    }
    await record("sent");
    return { ok: true };
  } catch (error) {
    console.error("Brevo email failed", error);
    await record("failed", "Email request failed.");
    return { ok: false, error: "Email request failed." };
  }
}

/**
 * Sends a new-order alert to the PRIVATE admin email address configured in
 * Admin → Settings. Never throws — a failed alert must never fail an order.
 */
export async function emailAdminOrderAlert(order: {
  orderNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  siteUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const settings = await getAdminNotifySettings();
  if (!settings.email_enabled) return { ok: false, error: "Email order notifications are disabled." };
  if (!(await automationEnabled("new_order")))
    return { ok: false, error: "The new-order automation rule is disabled." };
  if (!settings.email_address) return { ok: false, error: "No admin notification email configured." };

  const when = new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" });
  const link = `${(order.siteUrl ?? "").replace(/\/$/, "")}/admin/orders?order=${order.orderNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>New Order Received</h2>
      <p>
        Order: <strong>#${order.orderNumber}</strong><br>
        Customer: ${order.customerName}<br>
        Amount: GH₵${order.amount.toFixed(2)}<br>
        Payment Method: ${order.paymentMethod}<br>
        Status: ${order.status}<br>
        Date/Time: ${when}
      </p>
      <p><a href="${link}">Open the Admin Dashboard to view the order.</a></p>
    </div>`;
  const text = `New Order Received\n\nOrder: #${order.orderNumber}\nCustomer: ${order.customerName}\nAmount: GH₵${order.amount.toFixed(
    2,
  )}\nPayment Method: ${order.paymentMethod}\nStatus: ${order.status}\nDate/Time: ${when}\n\n${link}`;

  return sendBrevoEmail({
    to: settings.email_address,
    subject: `🔔 New DigitalHubGH Order — #${order.orderNumber}`,
    html,
    text,
    log: {
      message_type: "admin_new_order",
      template_key: "new_order",
      source: "automated",
      dedupe_key: `admin_new_order:${order.orderNumber}`,
    },
  });
}


/** Creates an in-app notification for every staff/admin user. Never throws. */
export async function notifyStaff(input: {
  title: string;
  body?: string;
  type?: string;
  link?: string;
}): Promise<void> {
  try {
    const { data: staff } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "super_admin", "support_admin", "product_admin", "order_admin"]);
    const ids = Array.from(new Set((staff ?? []).map((r) => r.user_id)));
    if (!ids.length) return;
    await supabaseAdmin.from("notifications").insert(
      ids.map((id) => ({
        user_id: id,
        title: input.title,
        body: input.body ?? null,
        type: input.type ?? "admin",
        link: input.link ?? null,
      })),
    );
  } catch (error) {
    console.error("notifyStaff failed", error);
  }
}

export async function notifyUser(input: {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: input.userId,
    title: input.title,
    body: input.body ?? null,
    type: input.type ?? "general",
    link: input.link ?? null,
  });
  if (error) console.error("notifyUser failed", error);
}

export async function logAdminAction(input: {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_activity_logs").insert({
    admin_id: input.adminId,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    description: input.description ?? null,
    metadata: JSON.parse(JSON.stringify(input.metadata ?? {})),
  });
  if (error) console.error("logAdminAction failed", error);
}

export async function assertStaff(supabase: {
  rpc: (fn: "is_staff", args: { _user_id: string }) => PromiseLike<{ data: unknown; error: unknown }>;
}, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("is_staff", { _user_id: userId });
  if (error || data !== true) throw new Error("Forbidden: staff access required");
}
