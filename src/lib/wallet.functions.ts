import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Wallet + email-approved deposits. Every balance change happens inside
 * SECURITY DEFINER database functions (row locks + unique idempotency keys);
 * this module only validates input, sends emails and handles approval tokens.
 */

type Ctx = { supabase: any; userId: string };

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ghs = (n: unknown) => `GH₵${Number(n ?? 0).toFixed(2)}`;

async function isWalletAdmin(supabase: any, userId: string): Promise<boolean> {
  for (const role of ["super_admin", "admin", "order_admin"]) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (data === true) return true;
  }
  return false;
}

async function assertWalletAdmin(ctx: Ctx) {
  if (!(await isWalletAdmin(ctx.supabase, ctx.userId))) throw new Error("Admin access required");
}

/** Emails the private approval address a GET-safe review link (no action happens on open). */
async function emailDepositForApproval(depositId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendBrevoEmail } = await import("./notify.server");
  const { data: priv } = await supabaseAdmin.from("store_settings").select("value").eq("key", "wallet_private").maybeSingle();
  const cfg = (priv?.value ?? {}) as { approval_email?: string; token_hours?: number };
  const to = String(cfg.approval_email ?? "").trim();
  if (!to) return;
  const { data: d } = await supabaseAdmin.from("wallet_deposits").select("*").eq("id", depositId).maybeSingle();
  if (!d) return;
  const { data: p } = await supabaseAdmin.from("profiles").select("full_name, email, phone").eq("id", d.user_id).maybeSingle();
  const token = randomToken();
  const hours = Math.min(Math.max(Number(cfg.token_hours ?? 48), 1), 168);
  await supabaseAdmin.from("wallet_deposit_tokens").insert({
    deposit_id: d.id,
    token_hash: await sha256(token),
    expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
  });
  const site = process.env["SITE_URL"] ?? "https://digitalhubgh.vercel.app";
  const link = `${site}/admin/wallet-review?token=${token}`;
  const rows: [string, unknown][] = [
    ["Customer", p?.full_name], ["Email", p?.email], ["Phone", p?.phone], ["Amount", ghs(d.amount)],
    ["Method", d.method], ["Transaction reference", d.reference], ["Sender number", d.sender_number],
    ["Sender name", d.sender_name], ["Customer note", d.customer_note], ["Submitted", new Date(d.created_at).toUTCString()],
    ["Deposit ID", d.id],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
  <h2 style="color:#0046be">Wallet deposit awaiting approval</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px;border-bottom:1px solid #eee;color:#666">${esc(k)}</td><td style="padding:6px;border-bottom:1px solid #eee"><b>${esc(v || "—")}</b></td></tr>`)
    .join("")}</table>
  <p style="font-size:13px;color:#666">The payment proof is private. Sign in as an administrator to view it and to approve, reject or request more information. Opening the link does not change anything.</p>
  <p style="text-align:center;margin:24px 0"><a href="${link}" style="background:#0046be;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold">Review deposit</a></p>
  <p style="font-size:12px;color:#999">This single-use link expires in ${hours} hours.</p></div>`;
  await sendBrevoEmail({
    to,
    subject: `Wallet deposit ${ghs(d.amount)} – ${p?.full_name || "customer"} – ref ${d.reference}`,
    html,
    log: { message_type: "wallet_deposit_admin", customer_id: d.user_id, source: "automated", dedupe_key: null },
  });
}

async function emailCustomerDecision(depositId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendBrevoEmail } = await import("./notify.server");
  const { data: d } = await supabaseAdmin.from("wallet_deposits").select("*").eq("id", depositId).maybeSingle();
  if (!d) return;
  const { data: p } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", d.user_id).maybeSingle();
  const { data: w } = await supabaseAdmin.from("wallets").select("balance").eq("user_id", d.user_id).maybeSingle();
  if (!p?.email) return;
  const msg =
    d.status === "APPROVED"
      ? `Your deposit of <b>${ghs(d.amount)}</b> was approved. New wallet balance: <b>${ghs(w?.balance)}</b>.`
      : d.status === "REJECTED"
        ? `Your deposit of <b>${ghs(d.amount)}</b> was rejected. Reason: ${esc(d.admin_note)}`
        : `We need more information about your deposit of <b>${ghs(d.amount)}</b>: ${esc(d.admin_note)}`;
  await sendBrevoEmail({
    to: p.email,
    subject: `Wallet deposit ${d.status === "APPROVED" ? "approved" : d.status === "REJECTED" ? "rejected" : "needs more information"}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><p>Hi ${esc(p.full_name || "there")},</p><p>${msg}</p><p>Reference: ${esc(d.reference)}</p><p><a href="${process.env["SITE_URL"] ?? "https://digitalhubgh.vercel.app"}/dashboard/wallet">Open my wallet</a></p></div>`,
    log: { message_type: "wallet_deposit_customer", customer_id: d.user_id, source: "automated", dedupe_key: `wallet:${d.id}:${d.status}:${d.reviewed_at}` },
  });
}

/* ---------------- customer ---------------- */

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: wallet, error } = await sb.rpc("ensure_my_wallet");
    if (error) throw new Error(error.message);
    const [tx, deps, settings] = await Promise.all([
      sb.from("wallet_transactions").select("id, type, direction, amount, balance_after, description, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100),
      sb.from("wallet_deposits").select("id, amount, method, reference, status, admin_note, created_at, expires_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50),
      sb.from("store_settings").select("value").eq("key", "wallet").maybeSingle(),
    ]);
    const s = (settings.data?.value ?? {}) as Record<string, unknown>;
    return {
      wallet: { balance: Number(wallet?.balance ?? 0), status: String(wallet?.status ?? "active"), currency: String(wallet?.currency ?? "GHS") },
      transactions: tx.data ?? [],
      deposits: deps.data ?? [],
      settings: {
        depositsEnabled: s.deposits_enabled === true,
        spendingEnabled: s.spending_enabled === true,
        minDeposit: Number(s.min_deposit ?? 5),
        maxDeposit: Number(s.max_deposit ?? 5000),
      },
    };
  });

export const submitWalletDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      amount: z.number().positive().max(100000),
      method: z.string().trim().max(40).default("mobile_money"),
      reference: z.string().trim().min(3).max(80),
      senderNumber: z.string().trim().min(7).max(30),
      senderName: z.string().trim().max(120).optional().nullable(),
      proofPath: z.string().trim().min(3).max(400),
      note: z.string().trim().max(500).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!data.proofPath.startsWith(`${context.userId}/`)) throw new Error("Invalid payment proof.");
    const { data: id, error } = await context.supabase.rpc("create_wallet_deposit", {
      _amount: Math.round(data.amount * 100) / 100,
      _method: data.method,
      _reference: data.reference,
      _sender_number: data.senderNumber,
      _sender_name: data.senderName ?? null,
      _proof_path: data.proofPath,
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    try { await emailDepositForApproval(id as string); } catch (e) { console.error("deposit approval email failed", e); }
    return { id: id as string };
  });

export const cancelWalletDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc("cancel_my_wallet_deposit", { _deposit_id: data.id });
    if (error) throw new Error(error.message);
    if (!ok) throw new Error("This deposit can no longer be cancelled.");
    return { ok: true };
  });

export const resubmitWalletDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reference: z.string().trim().max(80).optional().nullable(), proofPath: z.string().trim().max(400).optional().nullable(), note: z.string().trim().max(500).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc("resubmit_my_wallet_deposit", {
      _deposit_id: data.id, _reference: data.reference ?? null, _proof_path: data.proofPath ?? null, _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    if (!ok) throw new Error("This deposit cannot be updated.");
    try { await emailDepositForApproval(data.id); } catch (e) { console.error(e); }
    return { ok: true };
  });

export const payOrderWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("pay_order_with_wallet", { _order_id: data.orderId });
    if (error) throw new Error(error.message);
    try {
      const { dispatchOrderEvent } = await import("./notify.server");
      await (dispatchOrderEvent as any)(data.orderId, "payment_verified");
    } catch (e) { console.error("wallet payment notification failed", e); }
    return { ok: true };
  });

/* ---------------- admin ---------------- */

export const adminListWalletData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.string().max(40).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertWalletAdmin(context);
    const sb = context.supabase;
    let dq = sb.from("wallet_deposits").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.status && data.status !== "ALL") dq = dq.eq("status", data.status);
    const [deps, wallets, tx] = await Promise.all([
      dq,
      sb.from("wallets").select("user_id, balance, status, updated_at").order("balance", { ascending: false }).limit(500),
      sb.from("wallet_transactions").select("id, user_id, type, direction, amount, balance_after, description, created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    const ids = Array.from(new Set([...(deps.data ?? []), ...(wallets.data ?? []), ...(tx.data ?? [])].map((r: any) => r.user_id)));
    const { data: profiles } = ids.length ? await sb.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
    const { data: settings } = await sb.from("store_settings").select("key, value").in("key", ["wallet", "wallet_private"]);
    const { data: isSuper } = await sb.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    return {
      deposits: deps.data ?? [],
      wallets: wallets.data ?? [],
      transactions: tx.data ?? [],
      profiles: profiles ?? [],
      settings: Object.fromEntries((settings ?? []).map((r: any) => [r.key, r.value])),
      isSuperAdmin: isSuper === true,
    };
  });

export const adminDepositProofUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertWalletAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: d } = await supabaseAdmin.from("wallet_deposits").select("proof_path").eq("id", data.id).maybeSingle();
    if (!d?.proof_path) return { url: null };
    const { data: signed } = await supabaseAdmin.storage.from("payment-proofs").createSignedUrl(d.proof_path, 120);
    return { url: signed?.signedUrl ?? null };
  });

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject", "request_info"]),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const adminDecideDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decisionSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_decide_wallet_deposit", {
      _deposit_id: data.id, _decision: data.decision, _note: data.note ?? null, _source: "dashboard",
    });
    if (error) throw new Error(error.message);
    if (!String(result).startsWith("ALREADY_")) {
      try { await emailCustomerDecision(data.id); } catch (e) { console.error(e); }
    }
    return { result: String(result) };
  });

/** Loads a deposit from an email link. Requires a signed-in wallet admin; never changes anything. */
export const reviewDepositByToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertWalletAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: t } = await supabaseAdmin.from("wallet_deposit_tokens").select("*").eq("token_hash", await sha256(data.token)).maybeSingle();
    if (!t) throw new Error("This approval link is invalid.");
    const { data: d } = await supabaseAdmin.from("wallet_deposits").select("*").eq("id", t.deposit_id).maybeSingle();
    const { data: p } = d ? await supabaseAdmin.from("profiles").select("full_name, email, phone").eq("id", d.user_id).maybeSingle() : { data: null };
    return {
      deposit: d,
      customer: p,
      tokenUsed: Boolean(t.used_at),
      usedAction: t.used_action,
      tokenExpired: new Date(t.expires_at).getTime() <= Date.now(),
    };
  });

/** Applies a decision from an email link: requires admin sign-in + explicit POST confirmation; single use. */
export const decideDepositByToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decisionSchema.extend({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertWalletAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await sha256(data.token);
    const { data: claimed } = await supabaseAdmin
      .from("wallet_deposit_tokens")
      .update({ used_at: new Date().toISOString(), used_by: context.userId, used_action: data.decision })
      .eq("token_hash", hash)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("deposit_id")
      .maybeSingle();
    if (!claimed) throw new Error("This approval link has expired or was already used. Open the deposit from the admin Wallets page.");
    const { data: result, error } = await context.supabase.rpc("admin_decide_wallet_deposit", {
      _deposit_id: claimed.deposit_id, _decision: data.decision, _note: data.note ?? null, _source: "email",
    });
    if (error) {
      await supabaseAdmin.from("wallet_deposit_tokens").update({ used_at: null, used_by: null, used_action: null }).eq("token_hash", hash);
      throw new Error(error.message);
    }
    if (!String(result).startsWith("ALREADY_")) {
      try { await emailCustomerDecision(claimed.deposit_id); } catch (e) { console.error(e); }
    }
    return { result: String(result) };
  });

export const adminRefundToWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ orderNumber: z.string().trim().min(3).max(40), amount: z.number().positive(), reason: z.string().trim().min(3).max(500), requestKey: z.string().min(8).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertWalletAdmin(context);
    const { data: o } = await context.supabase.from("orders").select("id").eq("order_number", data.orderNumber).maybeSingle();
    if (!o) throw new Error("Order not found");
    const { error } = await context.supabase.rpc("admin_refund_order_to_wallet", {
      _order_id: o.id, _amount: Math.round(data.amount * 100) / 100, _reason: data.reason, _request_key: data.requestKey,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAdjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), amount: z.number().positive(), direction: z.enum(["credit", "debit"]), reason: z.string().trim().min(3).max(500), requestKey: z.string().min(8).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_adjust_wallet", {
      _user: data.userId, _amount: Math.round(data.amount * 100) / 100, _direction: data.direction, _reason: data.reason, _request_key: data.requestKey,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetWalletStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), status: z.enum(["active", "frozen"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_set_wallet_status", { _user: data.userId, _status: data.status });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveWalletSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      depositsEnabled: z.boolean(), spendingEnabled: z.boolean(),
      minDeposit: z.number().min(1).max(100000), maxDeposit: z.number().min(1).max(100000),
      expiryDays: z.number().int().min(1).max(60), approvalEmail: z.string().trim().email().max(200), tokenHours: z.number().int().min(1).max(168),
    }).refine((v) => v.maxDeposit >= v.minDeposit, "Maximum must be at least the minimum").parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    if (isSuper !== true) throw new Error("Super admin access required");
    const rows = [
      { key: "wallet", value: { deposits_enabled: data.depositsEnabled, spending_enabled: data.spendingEnabled, min_deposit: data.minDeposit, max_deposit: data.maxDeposit, deposit_expiry_days: data.expiryDays } },
      { key: "wallet_private", value: { approval_email: data.approvalEmail, token_hours: data.tokenHours } },
    ];
    const { error } = await context.supabase.from("store_settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    const { logAdminAction } = await import("./notify.server");
    await logAdminAction({ adminId: context.userId, action: "wallet_settings", targetType: "settings", description: "Updated wallet settings", metadata: { deposits_enabled: data.depositsEnabled, spending_enabled: data.spendingEnabled } });
    return { ok: true };
  });
