import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const cartSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  couponCode: z.string().trim().max(40).optional().nullable(),
});

const checkoutSchema = cartSchema.extend({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(30),
  note: z.string().trim().max(500).optional().nullable(),
  /** Storage object path inside the `payment-proofs` bucket (`<userId>/<file>`). */
  proofPath: z.string().trim().max(400).optional().nullable(),
});


type PricedLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

async function priceCart(
  admin: typeof import("@/integrations/supabase/client.server")["supabaseAdmin"],
  items: { productId: string; quantity: number }[],
  couponCode: string | null | undefined,
  userId: string,
) {
  const ids = items.map((i) => i.productId);
  const { data: products, error } = await admin
    .from("products")
    .select("id, name, price, discount_price, stock, unlimited_stock, is_active")
    .in("id", ids);
  if (error) throw new Error(error.message);

  const lines: PricedLine[] = [];
  for (const item of items) {
    const product = products?.find((p) => p.id === item.productId);
    if (!product) throw new Error("One of the products no longer exists.");
    if (!product.is_active) throw new Error(`"${product.name}" is no longer available.`);
    if (!product.unlimited_stock && product.stock < item.quantity)
      throw new Error(`"${product.name}" only has ${product.stock} left in stock.`);
    const price = Number(product.price);
    const discount = product.discount_price === null ? null : Number(product.discount_price);
    const unit = discount !== null && discount > 0 && discount < price ? discount : price;
    if (unit < 0) throw new Error("Invalid product price.");
    lines.push({
      productId: product.id,
      name: product.name,
      unitPrice: unit,
      quantity: item.quantity,
      lineTotal: Number((unit * item.quantity).toFixed(2)),
    });
  }

  const subtotal = Number(lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));

  let discount = 0;
  let coupon: { id: string; code: string } | null = null;
  const code = couponCode?.trim().toUpperCase();
  if (code) {
    const { data: c } = await admin.from("coupons").select("*").ilike("code", code).maybeSingle();
    if (!c) throw new Error("Coupon code not found.");
    if (!c.is_active) throw new Error("This coupon is disabled.");
    const now = new Date();
    if (c.starts_at && new Date(c.starts_at) > now) throw new Error("This coupon is not active yet.");
    if (c.expires_at && new Date(c.expires_at) < now) throw new Error("This coupon has expired.");
    if (subtotal < Number(c.min_order))
      throw new Error(`Minimum order for this coupon is GH₵${Number(c.min_order).toFixed(2)}.`);
    if (c.max_uses !== null && c.used_count >= c.max_uses) throw new Error("This coupon has reached its usage limit.");
    const { count } = await admin
      .from("coupon_usage")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", c.id)
      .eq("user_id", userId);
    if ((count ?? 0) >= c.per_user_limit) throw new Error("You have already used this coupon.");
    discount =
      c.discount_type === "percent"
        ? Number(((subtotal * Number(c.discount_value)) / 100).toFixed(2))
        : Number(Number(c.discount_value).toFixed(2));
    discount = Math.min(discount, subtotal);
    coupon = { id: c.id, code: c.code };
  }

  const total = Number(Math.max(0, subtotal - discount).toFixed(2));
  return { lines, subtotal, discount, total, coupon };
}

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => cartSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const priced = await priceCart(supabaseAdmin, data.items, data.couponCode, context.userId);
    return {
      subtotal: priced.subtotal,
      discount: priced.discount,
      total: priced.total,
      code: priced.coupon?.code ?? null,
    };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyUser, telegramAlert } = await import("./notify.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_banned")
      .eq("id", context.userId)
      .maybeSingle();
    if (profile?.is_banned) throw new Error("Your account is suspended. Please contact support.");

    // Duplicate-submit guard: an identical unpaid order in the last 2 minutes.
    const { data: recent } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, created_at")
      .eq("user_id", context.userId)
      .eq("payment_status", "pending")
      .gte("created_at", new Date(Date.now() - 120_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    const priced = await priceCart(supabaseAdmin, data.items, data.couponCode, context.userId);

    // A proof can only ever live in the caller's own storage folder.
    const proofPath = data.proofPath?.trim() || null;
    if (proofPath && !proofPath.startsWith(`${context.userId}/`))
      throw new Error("Invalid payment proof reference.");

    if (recent?.[0] && Number(recent[0].total) === priced.total) {
      return { orderId: recent[0].id, orderNumber: recent[0].order_number, total: priced.total, duplicate: true };
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        customer_name: data.fullName,
        customer_email: data.email,
        customer_phone: data.phone,
        subtotal: priced.subtotal,
        discount: priced.discount,
        total: priced.total,
        coupon_code: priced.coupon?.code ?? null,
        customer_note: data.note ?? null,
        status: "payment_pending",
        payment_status: proofPath ? "submitted" : "pending",
      })
      .select("id, order_number")
      .single();
    if (orderError || !order) throw new Error(orderError?.message ?? "Could not create your order.");

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      priced.lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        product_name: l.name,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        line_total: l.lineTotal,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      user_id: context.userId,
      method: "mobile_money",
      amount: priced.total,
      proof_path: proofPath,
      status: proofPath ? "submitted" : "pending",
    });


    await supabaseAdmin.from("order_status_history").insert([
      { order_id: order.id, status: "placed", note: "Order created" },
      { order_id: order.id, status: "payment_pending", note: "Awaiting Mobile Money payment" },
    ]);

    if (priced.coupon) {
      await supabaseAdmin
        .from("coupon_usage")
        .insert({ coupon_id: priced.coupon.id, user_id: context.userId, order_id: order.id });
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("used_count")
        .eq("id", priced.coupon.id)
        .maybeSingle();
      await supabaseAdmin
        .from("coupons")
        .update({ used_count: (c?.used_count ?? 0) + 1 })
        .eq("id", priced.coupon.id);
    }

    await notifyUser({
      userId: context.userId,
      title: `Order ${order.order_number} placed`,
      body: "Complete your Mobile Money payment and submit your transaction ID so we can verify it.",
      type: "order",
      link: `/dashboard/orders/${order.id}`,
    });
    // Admin notifications must never be able to fail a valid order.
    try {
      const { notifyStaff, emailAdminOrderAlert, getAdminNotifySettings } = await import("./notify.server");
      const adminNotify = await getAdminNotifySettings();

      if (adminNotify.website_enabled) {
        await notifyStaff({
          title: "New Order Received 🔔",
          body: `${order.order_number} · ${data.fullName} · GH₵${priced.total.toFixed(2)} · Mobile Money · ${
            proofPath ? "payment submitted" : "payment pending"
          }`,
          type: "order",
          link: `/admin/orders?order=${order.order_number}`,
        });
      }

      await telegramAlert(
        `🛒 <b>New order</b>\n${order.order_number}\nCustomer: ${data.fullName} (${data.phone})\nTotal: GH₵${priced.total.toFixed(2)}`,
      );

      // Customer confirmation email (Automation Rules: new_order).
      const { dispatchOrderEvent } = await import("./notify.server");
      await dispatchOrderEvent("new_order", order.id);

      // Email alert to the private admin address (no-op when disabled).
      await emailAdminOrderAlert({
        orderNumber: order.order_number,
        customerName: data.fullName,
        amount: priced.total,
        paymentMethod: "Mobile Money",
        status: proofPath ? "Payment submitted" : "Pending payment",
        siteUrl: process.env["SITE_URL"] ?? "https://digitalhubgh.vercel.app",
      });
    } catch (notifyError) {
      console.error("order admin notification failed", notifyError);
    }


    return { orderId: order.id, orderNumber: order.order_number, total: priced.total, duplicate: false };
  });

export const submitPaymentProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        reference: z.string().trim().min(3).max(80),
        senderNumber: z.string().trim().min(7).max(30),
        proofPath: z.string().trim().max(400).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyUser, telegramAlert } = await import("./notify.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, user_id, total, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.user_id !== context.userId) throw new Error("Order not found.");
    if (order.payment_status === "verified") throw new Error("This order is already paid.");
    if (data.proofPath && !data.proofPath.startsWith(`${context.userId}/`))
      throw new Error("Invalid payment proof reference.");

    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        reference: data.reference,
        sender_number: data.senderNumber,
        proof_path: data.proofPath ?? null,
        status: "submitted",
      })
      .eq("order_id", order.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("orders").update({ payment_status: "submitted" }).eq("id", order.id);
    await supabaseAdmin
      .from("order_status_history")
      .insert({ order_id: order.id, status: "payment_pending", note: "Payment submitted for verification" });

    await notifyUser({
      userId: context.userId,
      title: `Payment submitted for ${order.order_number}`,
      body: "Our team is verifying your Mobile Money payment. You will be notified once it is confirmed.",
      type: "payment",
      link: `/dashboard/orders/${order.id}`,
    });
    await telegramAlert(
      `💰 <b>Payment submitted</b>\n${order.order_number}\nRef: ${data.reference}\nFrom: ${data.senderNumber}\nAmount: GH₵${Number(order.total).toFixed(2)}`,
    );

    return { ok: true };
  });

export const requestRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().uuid(), reason: z.string().trim().min(10).max(1000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { telegramAlert } = await import("./notify.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, user_id, total, customer_name, customer_email")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.user_id !== context.userId) throw new Error("Order not found.");

    const { data: existing } = await supabaseAdmin
      .from("refunds")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();
    if (existing) throw new Error("A refund request already exists for this order.");

    const { error } = await supabaseAdmin.from("refunds").insert({
      order_id: order.id,
      user_id: context.userId,
      amount: order.total,
      reason: data.reason,
      status: "requested",
    });
    if (error) throw new Error(error.message);
    await telegramAlert(`↩️ <b>Refund requested</b>\n${order.order_number}\nReason: ${data.reason.slice(0, 200)}`);

    // Notify staff in-app + email the private admin address (rule: refund_requested).
    try {
      const { notifyStaff, getAdminNotifySettings, sendAutomatedMessage } = await import("./notify.server");
      const adminNotify = await getAdminNotifySettings();
      if (adminNotify.website_enabled) {
        await notifyStaff({
          title: "Refund requested",
          body: `${order.order_number}: ${data.reason.slice(0, 200)}`,
          type: "refund",
          link: "/admin/support",
        });
      }
      if (adminNotify.email_enabled && adminNotify.email_address) {
        await sendAutomatedMessage({
          trigger: "refund_requested",
          to: adminNotify.email_address,
          vars: {
            customer_name: order.customer_name ?? "",
            customer_email: order.customer_email ?? "",
            order_id: order.order_number,
            amount: Number(order.total ?? 0).toFixed(2),
          },
          dedupeKey: `refund_requested:${order.id}`,
          customerId: context.userId,
          orderId: order.id,
        });
      }
    } catch (error) {
      console.error("refund request notification failed", error);
    }

    return { ok: true };
  });

export const claimReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().trim().min(4).max(20) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin
      .from("profiles")
      .select("id, referred_by")
      .eq("id", context.userId)
      .maybeSingle();
    if (!me || me.referred_by) return { ok: false };
    const { data: referrer } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", data.code.toUpperCase())
      .maybeSingle();
    if (!referrer || referrer.id === context.userId) return { ok: false };

    await supabaseAdmin.from("profiles").update({ referred_by: referrer.id }).eq("id", context.userId);
    await supabaseAdmin
      .from("referrals")
      .insert({ referrer_id: referrer.id, referred_id: context.userId, status: "pending" });
    return { ok: true };
  });

/** Notifies staff + acknowledges the customer after a support ticket is created. */
export const notifySupportTicketCreated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ ticketId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("id, user_id, subject, category")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket || ticket.user_id !== context.userId) return { ok: false };

    const { notifyStaff, getAdminNotifySettings, sendAutomatedMessage, sendBrevoEmail } = await import(
      "./notify.server"
    );
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", ticket.user_id)
      .maybeSingle();
    const ref = ticket.id.slice(0, 8).toUpperCase();

    try {
      const adminNotify = await getAdminNotifySettings();
      if (adminNotify.website_enabled) {
        await notifyStaff({
          title: "New support ticket",
          body: `${ref} · ${ticket.subject}`,
          type: "support",
          link: "/admin/support",
        });
      }

      // Customer acknowledgement (Automation Rules: support_created).
      await sendAutomatedMessage({
        trigger: "support_created",
        templateKey: "support_received",
        to: profile?.email ?? null,
        vars: {
          customer_name: profile?.full_name || "there",
          customer_email: profile?.email ?? "",
          support_ticket_id: ref,
        },
        dedupeKey: `support_created:${ticket.id}`,
        customerId: ticket.user_id,
      });

      // Private staff alert.
      if (adminNotify.email_enabled && adminNotify.email_address) {
        await sendBrevoEmail({
          to: adminNotify.email_address,
          subject: `🎫 New support ticket ${ref}`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>New support ticket <strong>${ref}</strong></p><p>Subject: ${ticket.subject}</p><p>Category: ${ticket.category ?? "—"}</p><p><a href="/admin/support">Open Admin → Support</a></p></div>`,
          text: `New support ticket ${ref}\nSubject: ${ticket.subject}`,
          log: {
            message_type: "admin_support_ticket",
            template_key: "support_received",
            source: "automated",
            customer_id: ticket.user_id,
            dedupe_key: `admin_support_ticket:${ticket.id}`,
          },
        });
      }
    } catch (error) {
      console.error("support ticket notification failed", error);
    }
    return { ok: true };
  });
