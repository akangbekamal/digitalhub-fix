import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireStaff(context: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await (context.supabase.rpc as (n: string, a: unknown) => Promise<{ data: unknown }>)("is_staff", {
    _user_id: context.userId,
  });
  if (data !== true) throw new Error("Forbidden: staff access required.");
  return context.userId;
}

export type MessageLogRow = {
  id: string;
  created_at: string;
  message_type: string;
  template_key: string | null;
  channel: string;
  recipient: string | null;
  order_id: string | null;
  customer_id: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  error: string | null;
  source: string;
};

/** Message Center data: stored overrides, automation flags and history. Staff only. */
export const getMessageCenterData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.string().optional(),
        type: z.string().optional(),
        search: z.string().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getMessageCenterSettings } = await import("./notify.server");

    const settings = await getMessageCenterSettings();

    let q = supabaseAdmin
      .from("message_logs")
      .select("id, created_at, message_type, template_key, channel, recipient, order_id, customer_id, subject, body, status, error, source")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.type && data.type !== "all") q = q.eq("message_type", data.type);
    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);

    const term = (data.search ?? "").trim().toLowerCase();
    const rows = ((logs ?? []) as MessageLogRow[]).filter(
      (l) =>
        !term ||
        (l.recipient ?? "").toLowerCase().includes(term) ||
        (l.subject ?? "").toLowerCase().includes(term) ||
        (l.message_type ?? "").toLowerCase().includes(term),
    );

    // Rule statistics come from the real history, never fabricated.
    const stats: Record<string, { count: number; last: string | null }> = {};
    for (const l of (logs ?? []) as MessageLogRow[]) {
      const key = l.template_key ?? l.message_type;
      const s = stats[key] ?? { count: 0, last: null };
      s.count += 1;
      if (!s.last) s.last = l.created_at;
      stats[key] = s;
    }

    return { settings, logs: rows, stats };
  });

export const saveMessageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ key: z.string().min(1), subject: z.string().min(1).max(300), body: z.string().min(1).max(20000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getMessageCenterSettings, logAdminAction } = await import("./notify.server");
    const settings = await getMessageCenterSettings();
    settings.templates[data.key] = { subject: data.subject, body: data.body };
    const { error } = await supabaseAdmin
      .from("store_settings")
      .upsert({ key: "message_center", value: settings as never }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await logAdminAction({ adminId, action: "message_template_saved", targetType: "message_template", targetId: data.key });
    return { ok: true };
  });

export const setAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ trigger: z.string().min(1), enabled: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getMessageCenterSettings, logAdminAction } = await import("./notify.server");
    const settings = await getMessageCenterSettings();
    settings.rules[data.trigger] = data.enabled;
    const { error } = await supabaseAdmin
      .from("store_settings")
      .upsert({ key: "message_center", value: settings as never }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await logAdminAction({
      adminId,
      action: data.enabled ? "automation_rule_enabled" : "automation_rule_disabled",
      targetType: "automation_rule",
      targetId: data.trigger,
    });
    return { ok: true };
  });

/** Manual send from the Message Generator. Requires an explicit admin action. */
export const sendManualMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        to: z.string().email(),
        subject: z.string().min(1).max(300),
        body: z.string().min(1).max(20000),
        templateKey: z.string().optional(),
        customerId: z.string().uuid().optional().nullable(),
        orderId: z.string().uuid().optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { sendBrevoEmail, logAdminAction } = await import("./notify.server");
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6">${data.body
      .split("\n")
      .map((line) => (line.trim() ? `<p>${line}</p>` : "<br>"))
      .join("")}</div>`;
    const result = await sendBrevoEmail({
      to: data.to,
      subject: data.subject,
      html,
      text: data.body,
      log: {
        message_type: data.templateKey ?? "manual",
        template_key: data.templateKey ?? null,
        customer_id: data.customerId ?? null,
        order_id: data.orderId ?? null,
        source: "manual",
        sent_by: adminId,
      },
    });
    await logAdminAction({
      adminId,
      action: result.ok ? "message_sent" : "message_failed",
      targetType: "message",
      ...(data.orderId ? { targetId: data.orderId } : {}),
      description: `${data.subject} → ${data.to}`,
    });
    if (!result.ok) throw new Error(result.error ?? "Email could not be sent.");
    return { ok: true };
  });

/** Safe retry of a failed message. Sent messages can never be re-sent from here. */
export const retryMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBrevoEmail } = await import("./notify.server");
    const { data: row, error } = await supabaseAdmin
      .from("message_logs")
      .select("id, recipient, subject, body, status, message_type, template_key, customer_id, order_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Message not found.");
    if (row.status !== "failed") throw new Error("Only failed messages can be retried.");
    if (!row.recipient) throw new Error("This message has no recipient.");

    const result = await sendBrevoEmail({
      to: row.recipient,
      subject: row.subject ?? "Message from DIGITAL HUB GH",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${(row.body ?? "")
        .split("\n")
        .map((line) => (line.trim() ? `<p>${line}</p>` : "<br>"))
        .join("")}</div>`,
      text: row.body ?? "",
      log: {
        message_type: row.message_type,
        template_key: row.template_key,
        customer_id: row.customer_id,
        order_id: row.order_id,
        source: "manual",
        sent_by: adminId,
      },
    });
    if (!result.ok) throw new Error(result.error ?? "Email could not be sent.");
    return { ok: true };
  });

/** Admin activity log (existing table). Staff only. */
export const getActivityLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ search: z.string().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("admin_activity_logs")
      .select("id, created_at, admin_id, action, target_type, target_id, description")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r) => r.admin_id).filter(Boolean))) as string[];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids);
      for (const p of profiles ?? []) names.set(p.id, p.full_name || p.email || p.id);
    }

    const term = (data.search ?? "").trim().toLowerCase();
    return (rows ?? [])
      .map((r) => ({
        id: r.id,
        created_at: r.created_at,
        actor: r.admin_id ? (names.get(r.admin_id) ?? "Admin") : "System",
        action: r.action,
        target_type: r.target_type,
        target_id: r.target_id,
        description: r.description,
      }))
      .filter(
        (r) =>
          !term ||
          r.action.toLowerCase().includes(term) ||
          r.actor.toLowerCase().includes(term) ||
          (r.description ?? "").toLowerCase().includes(term),
      );
  });
