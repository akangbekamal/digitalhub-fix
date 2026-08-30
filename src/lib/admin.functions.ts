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

/** Real dashboard statistics straight from the database. */
export const getAdminStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        /** ISO dates (inclusive) narrowing the revenue/orders figures. */
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [orders, customers, products, tickets, reviews, refunds, downloads, items] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, order_number, customer_name, customer_email, total, status, payment_status, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("id, created_at"),
      supabaseAdmin.from("products").select("id, name, stock, unlimited_stock, is_active, sold_count, price"),
      supabaseAdmin.from("support_tickets").select("id, status"),
      supabaseAdmin.from("reviews").select("id, status"),
      supabaseAdmin.from("refunds").select("id, status, amount"),
      supabaseAdmin.from("downloads").select("id, download_count"),
      supabaseAdmin.from("order_items").select("order_id, product_name, quantity, line_total"),
    ]);

    const orderRows = orders.data ?? [];
    const paid = orderRows.filter((o) => o.payment_status === "verified");
    const revenue = paid.reduce((s, o) => s + Number(o.total), 0);

    const fromTs = data.from ? new Date(`${data.from}T00:00:00.000Z`).getTime() : null;
    const toTs = data.to ? new Date(`${data.to}T23:59:59.999Z`).getTime() : null;
    const inRange = (iso: string) => {
      const ts = new Date(iso).getTime();
      return (fromTs === null || ts >= fromTs) && (toTs === null || ts <= toTs);
    };
    const rangeOrders = orderRows.filter((o) => inRange(o.created_at));
    const rangePaid = rangeOrders.filter((o) => o.payment_status === "verified");
    const rangeRevenue = rangePaid.reduce((s, o) => s + Number(o.total), 0);

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayOrders = orderRows.filter((o) => o.created_at.slice(0, 10) === todayKey);
    const todayRevenue = todayOrders
      .filter((o) => o.payment_status === "verified")
      .reduce((s, o) => s + Number(o.total), 0);

    const daily: Record<string, number> = {};
    for (const o of paid) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      daily[key] = (daily[key] ?? 0) + Number(o.total);
    }
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86_400_000).toISOString().slice(0, 10);
      return { date: d, revenue: Number((daily[d] ?? 0).toFixed(2)) };
    });

    // Revenue over the selected range, day by day (real verified payments only).
    const rangeDaily: Record<string, number> = {};
    for (const o of rangePaid) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      rangeDaily[key] = (rangeDaily[key] ?? 0) + Number(o.total);
    }
    const rangeSeries = Object.entries(rangeDaily)
      .map(([date, value]) => ({ date, revenue: Number(value.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const productRows = products.data ?? [];
    const customerRows = customers.data ?? [];

    // Revenue by product, from the real order items of paid orders.
    const paidIds = new Set(rangePaid.map((o) => o.id));
    const byProduct: Record<string, { revenue: number; units: number }> = {};
    for (const it of items.data ?? []) {
      if (!paidIds.has(it.order_id)) continue;
      const agg = byProduct[it.product_name] ?? { revenue: 0, units: 0 };
      agg.revenue += Number(it.line_total);
      agg.units += Number(it.quantity);
      byProduct[it.product_name] = agg;
    }
    const productRevenue = Object.entries(byProduct)
      .map(([name, v]) => ({ name, revenue: Number(v.revenue.toFixed(2)), units: v.units }))
      .sort((a, b) => b.revenue - a.revenue);

    const customerGrowth = (() => {
      const map: Record<string, number> = {};
      for (const c of customerRows) {
        const key = String(c.created_at).slice(0, 7);
        map[key] = (map[key] ?? 0) + 1;
      }
      return Object.entries(map)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);
    })();

    const lowStock = productRows
      .filter((p) => !p.unlimited_stock && p.stock <= 5)
      .map((p) => ({ id: p.id, name: p.name, stock: p.stock }));

    return {
      revenue: Number(revenue.toFixed(2)),
      avgOrderValue: paid.length ? Number((revenue / paid.length).toFixed(2)) : 0,
      totalOrders: orderRows.length,
      pendingPayments: orderRows.filter((o) => ["pending", "submitted"].includes(o.payment_status)).length,
      failedPayments: orderRows.filter((o) => ["failed", "rejected"].includes(o.payment_status)).length,
      pendingOrders: orderRows.filter((o) => ["pending", "processing", "paid"].includes(o.status)).length,
      completedOrders: orderRows.filter((o) => o.status === "completed").length,
      cancelledOrders: orderRows.filter((o) => o.status === "cancelled").length,
      refundedOrders: orderRows.filter((o) => o.status === "refunded").length,
      todayRevenue: Number(todayRevenue.toFixed(2)),
      todayOrders: todayOrders.length,
      customers: customerRows.length,
      products: productRows.length,
      activeProducts: productRows.filter((p) => p.is_active).length,
      lowStock,
      openTickets: (tickets.data ?? []).filter((t) => !["resolved", "closed"].includes(t.status)).length,
      totalTickets: (tickets.data ?? []).length,
      pendingReviews: (reviews.data ?? []).filter((r) => r.status === "pending").length,
      totalReviews: (reviews.data ?? []).length,
      refundsRequested: (refunds.data ?? []).filter((r) => r.status === "requested").length,
      refundTotal: Number(
        (refunds.data ?? [])
          .filter((r) => r.status === "completed")
          .reduce((s, r) => s + Number(r.amount), 0)
          .toFixed(2),
      ),
      downloadCount: (downloads.data ?? []).reduce((s, d) => s + d.download_count, 0),
      revenueSeries: last30,
      // Selected-date-range figures.
      range: {
        revenue: Number(rangeRevenue.toFixed(2)),
        orders: rangeOrders.length,
        avgOrderValue: rangePaid.length ? Number((rangeRevenue / rangePaid.length).toFixed(2)) : 0,
        completed: rangeOrders.filter((o) => o.status === "completed").length,
        cancelled: rangeOrders.filter((o) => o.status === "cancelled").length,
        refunded: rangeOrders.filter((o) => o.status === "refunded").length,
        paymentsVerified: rangeOrders.filter((o) => o.payment_status === "verified").length,
        paymentsFailed: rangeOrders.filter((o) => ["failed", "rejected"].includes(o.payment_status)).length,
        series: rangeSeries,
        statusBreakdown: Object.entries(
          rangeOrders.reduce<Record<string, number>>((acc, o) => {
            acc[o.status] = (acc[o.status] ?? 0) + 1;
            return acc;
          }, {}),
        ).map(([status, count]) => ({ status, count })),
        productRevenue,
      },
      customerGrowth,
      recentOrders: orderRows.slice(0, 10).map((o) => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        total: Number(o.total),
        status: o.status,
        payment_status: o.payment_status,
        created_at: o.created_at,
        products:
          (items.data ?? [])
            .filter((i) => i.order_id === o.id)
            .map((i) => i.product_name)
            .join(", ") || "—",
      })),
      pendingActions: {
        paymentsToVerify: orderRows.filter((o) => o.payment_status === "submitted").length,
        ordersToFulfil: orderRows.filter((o) => o.payment_status === "verified" && o.status !== "completed" && o.status !== "cancelled" && o.status !== "refunded").length,
        failedPayments: orderRows.filter((o) => ["failed", "rejected"].includes(o.payment_status)).length,
        lowStock: lowStock.length,
        unansweredTickets: (tickets.data ?? []).filter((t) => !["resolved", "closed"].includes(t.status)).length,
        pendingReviews: (reviews.data ?? []).filter((r) => r.status === "pending").length,
        refundRequests: (refunds.data ?? []).filter((r) => r.status === "requested").length,
      },
      statusBreakdown: Object.entries(
        orderRows.reduce<Record<string, number>>((acc, o) => {
          acc[o.status] = (acc[o.status] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([status, count]) => ({ status, count })),
      topProducts: [...productRows]
        .sort((a, b) => b.sold_count - a.sold_count)
        .slice(0, 8)
        .map((p) => ({ name: p.name, sold: p.sold_count })),
      lowestProducts: [...productRows]
        .filter((p) => p.is_active)
        .sort((a, b) => a.sold_count - b.sold_count)
        .slice(0, 8)
        .map((p) => ({ name: p.name, sold: p.sold_count })),
    };
  });

/** Approve or reject a Mobile Money payment. Approving unlocks downloads. */
export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        action: z.enum(["approve", "reject", "pending"]),
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyUser, telegramAlert, logAdminAction, dispatchOrderEvent } = await import("./notify.server");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, order_id, user_id, amount, status")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (!payment) throw new Error("Payment not found.");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, user_id")
      .eq("id", payment.order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");

    const status = data.action === "approve" ? "verified" : data.action === "reject" ? "failed" : "pending";
    await supabaseAdmin
      .from("payments")
      .update({ status, admin_note: data.note ?? null, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq("id", payment.id);

    if (data.action === "approve") {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "verified", status: "processing" })
        .eq("id", order.id);
      await supabaseAdmin.from("order_status_history").insert([
        { order_id: order.id, status: "payment_confirmed", note: "Payment verified by admin" },
        { order_id: order.id, status: "processing", note: "Preparing your digital products" },
      ]);

      // Unlock downloads + decrement stock for each purchased product.
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", order.id);
      for (const item of items ?? []) {
        if (!item.product_id) continue;
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("id, file_path, download_limit, download_expiry_hours, stock, unlimited_stock, sold_count")
          .eq("id", item.product_id)
          .maybeSingle();
        if (!product) continue;

        await supabaseAdmin
          .from("products")
          .update({
            sold_count: product.sold_count + item.quantity,
            stock: product.unlimited_stock ? product.stock : Math.max(0, product.stock - item.quantity),
          })
          .eq("id", product.id);

        if (product.file_path) {
          const { data: existing } = await supabaseAdmin
            .from("downloads")
            .select("id")
            .eq("order_id", order.id)
            .eq("product_id", product.id)
            .maybeSingle();
          if (!existing) {
            await supabaseAdmin.from("downloads").insert({
              user_id: order.user_id,
              order_id: order.id,
              product_id: product.id,
              file_path: product.file_path,
              max_downloads: product.download_limit,
              expires_at: new Date(Date.now() + product.download_expiry_hours * 3_600_000).toISOString(),
            });
          }
        }
      }

      await notifyUser({
        userId: order.user_id,
        title: `Payment confirmed for ${order.order_number}`,
        body: "Your payment was verified. Your order is now being processed.",
        type: "payment",
        link: `/dashboard/orders/${order.id}`,
      });

      // Mark a pending referral as rewarded on the buyer's first verified order.
      const { data: referral } = await supabaseAdmin
        .from("referrals")
        .select("id, referrer_id, status")
        .eq("referred_id", order.user_id)
        .maybeSingle();
      if (referral && referral.status === "pending") {
        const { data: settings } = await supabaseAdmin
          .from("store_settings")
          .select("value")
          .eq("key", "referral")
          .maybeSingle();
        const reward = Number((settings?.value as { reward_amount?: number } | null)?.reward_amount ?? 0);
        await supabaseAdmin
          .from("referrals")
          .update({ status: "rewarded", reward_amount: reward })
          .eq("id", referral.id);
        await notifyUser({
          userId: referral.referrer_id,
          title: "Referral reward earned",
          body: `A friend you referred completed their first order. Reward: GH₵${reward.toFixed(2)}.`,
          type: "referral",
          link: "/dashboard/referrals",
        });
      }
    } else if (data.action === "reject") {
      await supabaseAdmin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
      await notifyUser({
        userId: order.user_id,
        title: `Payment could not be verified for ${order.order_number}`,
        body: data.note ?? "Please check your transaction details and submit your payment proof again.",
        type: "payment",
        link: `/dashboard/orders/${order.id}`,
      });
    } else {
      await supabaseAdmin.from("orders").update({ payment_status: "submitted" }).eq("id", order.id);
    }

    // Automated customer emails (respects Automation Rules, one per event).
    if (data.action === "approve") {
      await dispatchOrderEvent("payment_approved", order.id, { dedupeSuffix: payment.id });
      await dispatchOrderEvent("order_processing", order.id);
    } else if (data.action === "reject") {
      await dispatchOrderEvent("payment_rejected", order.id, {
        dedupeSuffix: payment.id,
        ...(data.note ? { extraVars: { admin_note: data.note } } : {}),
      });
    }

    await logAdminAction({
      adminId,
      action: `payment_${data.action}`,
      targetType: "payment",
      targetId: payment.id,
      description: `Payment for ${order.order_number} marked ${status}`,
    });
    await telegramAlert(`✅ <b>Payment ${status}</b>\n${order.order_number}`);
    return { ok: true };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum([
          "placed",
          "payment_pending",
          "payment_confirmed",
          "processing",
          "ready",
          "completed",
          "cancelled",
          "refunded",
        ]),
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyUser, logAdminAction, telegramAlert, dispatchOrderEvent } = await import("./notify.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");

    await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", order.id);
    await supabaseAdmin
      .from("order_status_history")
      .insert({ order_id: order.id, status: data.status, note: data.note ?? null });

    if (data.status === "completed") {
      const { count } = await supabaseAdmin
        .from("downloads")
        .select("id", { count: "exact", head: true })
        .eq("order_id", order.id);
      await notifyUser({
        userId: order.user_id,
        title: `Order ${order.order_number} completed`,
        body: (count ?? 0) > 0 ? "Your downloads are ready in your dashboard." : "Thank you for shopping with us!",
        type: "order",
        link: (count ?? 0) > 0 ? "/dashboard/downloads" : `/dashboard/orders/${order.id}`,
      });
    } else {
      await notifyUser({
        userId: order.user_id,
        title: `Order ${order.order_number} updated`,
        body: `Status: ${data.status.replace(/_/g, " ")}`,
        type: "order",
        link: `/dashboard/orders/${order.id}`,
      });
    }

    // Automated status emails, de-duplicated per order + status.
    const statusTrigger: Record<string, string> = {
      processing: "order_processing",
      completed: "order_completed",
      cancelled: "order_cancelled",
    };
    const trigger = statusTrigger[data.status];
    if (trigger) await dispatchOrderEvent(trigger, order.id);

    await logAdminAction({
      adminId,
      action: "order_status_update",
      targetType: "order",
      targetId: order.id,
      description: `${order.order_number} → ${data.status}`,
    });
    await telegramAlert(`📦 <b>Order updated</b>\n${order.order_number} → ${data.status}`);
    return { ok: true };
  });

export const adjustInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        productId: z.string().uuid(),
        newQty: z.number().int().min(0).max(1_000_000),
        reason: z.string().trim().min(2).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAdminAction } = await import("./notify.server");

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, name, stock")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product) throw new Error("Product not found.");

    await supabaseAdmin.from("products").update({ stock: data.newQty }).eq("id", product.id);
    await supabaseAdmin.from("inventory_logs").insert({
      product_id: product.id,
      previous_qty: product.stock,
      new_qty: data.newQty,
      adjustment: data.newQty - product.stock,
      reason: data.reason,
      admin_id: adminId,
    });
    await logAdminAction({
      adminId,
      action: "inventory_adjust",
      targetType: "product",
      targetId: product.id,
      description: `${product.name}: ${product.stock} → ${data.newQty} (${data.reason})`,
    });
    return { ok: true };
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ reviewId: z.string().uuid(), action: z.enum(["approve", "reject", "remove"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAdminAction } = await import("./notify.server");

    if (data.action === "remove") {
      await supabaseAdmin.from("reviews").delete().eq("id", data.reviewId);
    } else {
      await supabaseAdmin
        .from("reviews")
        .update({ status: data.action === "approve" ? "approved" : "rejected" })
        .eq("id", data.reviewId);
    }
    await logAdminAction({
      adminId,
      action: `review_${data.action}`,
      targetType: "review",
      targetId: data.reviewId,
    });
    return { ok: true };
  });

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        ticketId: z.string().uuid(),
        message: z.string().trim().min(1).max(4000),
        status: z
          .enum(["open", "in_progress", "waiting_customer", "resolved", "closed"])
          .optional()
          .nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyUser, logAdminAction, sendAutomatedMessage } = await import("./notify.server");

    const { data: ticket } = await supabaseAdmin
      .from("support_tickets")
      .select("id, user_id, subject")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket) throw new Error("Ticket not found.");

    await supabaseAdmin.from("support_messages").insert({
      ticket_id: ticket.id,
      sender_id: adminId,
      is_staff_reply: true,
      message: data.message,
    });
    if (data.status) await supabaseAdmin.from("support_tickets").update({ status: data.status }).eq("id", ticket.id);

    await notifyUser({
      userId: ticket.user_id,
      title: "New Support Reply",
      body: `Support has replied to your ticket: ${ticket.subject}`,
      type: "support",
      link: "/dashboard/support",
    });
    // Email the customer that support replied.
    const { data: replyProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", ticket.user_id)
      .maybeSingle();
    await sendAutomatedMessage({
      trigger: "support_reply",
      to: replyProfile?.email ?? null,
      vars: {
        customer_name: replyProfile?.full_name || "there",
        customer_email: replyProfile?.email ?? "",
        support_ticket_id: ticket.id.slice(0, 8).toUpperCase(),
      },
      dedupeKey: `support_reply:${ticket.id}:${Date.now()}`,
      customerId: ticket.user_id,
    });

    await logAdminAction({ adminId, action: "support_reply", targetType: "ticket", targetId: ticket.id });
    return { ok: true };
  });

export const updateRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        refundId: z.string().uuid(),
        status: z.enum(["requested", "approved", "processing", "completed", "rejected"]),
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyUser, logAdminAction, dispatchOrderEvent } = await import("./notify.server");

    const { data: refund } = await supabaseAdmin
      .from("refunds")
      .select("id, user_id, order_id")
      .eq("id", data.refundId)
      .maybeSingle();
    if (!refund) throw new Error("Refund not found.");

    await supabaseAdmin
      .from("refunds")
      .update({ status: data.status, admin_note: data.note ?? null })
      .eq("id", refund.id);
    if (data.status === "completed") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "refunded", payment_status: "refunded" })
        .eq("id", refund.order_id);
      await supabaseAdmin
        .from("order_status_history")
        .insert({ order_id: refund.order_id, status: "refunded", note: "Refund completed" });
    }
    await notifyUser({
      userId: refund.user_id,
      title: `Refund ${data.status}`,
      body: data.note ?? "Your refund request status was updated. Refunds are sent back manually via Mobile Money.",
      type: "refund",
      link: `/dashboard/orders/${refund.order_id}`,
    });
    if (data.status === "approved" || data.status === "rejected") {
      await dispatchOrderEvent(`refund_${data.status}`, refund.order_id, { dedupeSuffix: refund.id });
    }

    await logAdminAction({ adminId, action: `refund_${data.status}`, targetType: "refund", targetId: refund.id });
    return { ok: true };
  });

/** Sets a customer's account status: active | suspended | deactivated. Staff only. */
export const setCustomerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        status: z.enum(["active", "suspended", "deactivated"]),
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAdminAction, notifyUser } = await import("./notify.server");

    const patch: Record<string, unknown> = {
      account_status: data.status,
      is_banned: data.status !== "active",
    };
    if (data.note !== undefined) patch["admin_note"] = data.note ?? null;

    let { error } = await supabaseAdmin.from("profiles").update(patch as never).eq("id", data.userId);
    if (error) {
      // Older database without the newer columns — keep the ban flag working.
      const retry = await supabaseAdmin
        .from("profiles")
        .update({ is_banned: data.status !== "active" })
        .eq("id", data.userId);
      if (retry.error) throw new Error(retry.error.message);
    }

    await notifyUser({
      userId: data.userId,
      title:
        data.status === "active"
          ? "Your account has been reactivated"
          : data.status === "suspended"
            ? "Your account has been suspended"
            : "Your account has been deactivated",
      body: data.status === "active" ? "You can use the store again." : "Please contact support for help.",
      type: "account",
    });

    await logAdminAction({
      adminId,
      action: `customer_${data.status}`,
      targetType: "profile",
      targetId: data.userId,
      ...(data.note ? { description: data.note } : {}),
    });
    return { ok: true, status: data.status };
  });


/** Only a super admin may change roles. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["customer", "admin", "super_admin", "support_admin", "product_admin", "order_admin"]),
        grant: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (isSuper !== true) throw new Error("Forbidden: super admin only.");
    if (data.userId === context.userId && !data.grant && data.role === "super_admin")
      throw new Error("You cannot remove your own super admin role.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAdminAction, notifyUser } = await import("./notify.server");

    if (data.grant) {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
      await notifyUser({
        userId: data.userId,
        title: "Your account permissions changed",
        body: `You were granted the ${data.role.replace(/_/g, " ")} role.`,
        type: "account",
      });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    }
    await logAdminAction({
      adminId: context.userId,
      action: data.grant ? "role_grant" : "role_revoke",
      targetType: "profile",
      targetId: data.userId,
      description: data.role,
    });
    return { ok: true };
  });

/** Publishing an announcement can also push it to customers' notification centre. */
export const broadcastAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ announcementId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAdminAction } = await import("./notify.server");

    const { data: announcement } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .eq("id", data.announcementId)
      .maybeSingle();
    if (!announcement) throw new Error("Announcement not found.");

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    const rows = (profiles ?? []).map((p) => ({
      user_id: p.id,
      title: announcement.title,
      body: announcement.message,
      type: "announcement",
      link: announcement.link_url ?? "/",
    }));
    if (rows.length) await supabaseAdmin.from("notifications").insert(rows);

    await logAdminAction({
      adminId,
      action: "announcement_broadcast",
      targetType: "announcement",
      targetId: announcement.id,
      description: `Sent to ${rows.length} customers`,
    });
    return { sent: rows.length };
  });
/** Reserve a digital inventory item for an existing order. */
export const reserveDigitalInventoryForOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        inventoryId: z.string().uuid(),
        orderId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context);

    // The SQL function guards on auth.uid(), so it must be called as the
    // signed-in staff user. The service-role client has no auth.uid() and
    // would always fail with "Staff access required".
    const { data: reserved, error } = await (context.supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "reserve_digital_inventory",
      {
        p_inventory_id: data.inventoryId,
        p_order_id: data.orderId,
      },
    );


    if (error) {
      throw new Error(error.message);
    }

    if (reserved !== true) {
      throw new Error(
        "This inventory item is no longer available. Please select another item.",
      );
    }

    return {
      success: true,
    };
  });

/** Sends a test email to the private admin notification address. Staff only. */
export const sendTestAdminEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context);
    const { emailConfigured, getAdminNotifySettings, sendBrevoEmail } = await import("./notify.server");
    if (!emailConfigured())
      throw new Error("Email provider is not configured. Add the BREVO_API_KEY and BREVO_FROM_EMAIL secrets first.");
    const settings = await getAdminNotifySettings();
    if (!settings.email_address) throw new Error("Add an order notification email address and save first.");
    const result = await sendBrevoEmail({
      to: settings.email_address,
      subject: "Test notification — DIGITAL HUB GH",
      html: "<p>This is a test admin notification from DIGITAL HUB GH.</p>",
      text: "This is a test admin notification from DIGITAL HUB GH.",
    });
    if (!result.ok) throw new Error(result.error ?? "Could not send the test email.");
    return { ok: true };
  });

/** Tells the admin UI whether the email provider is configured server-side. Staff only. */
export const getNotificationProviderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context);
    const { emailConfigured } = await import("./notify.server");
    return { email: emailConfigured() };
  });

/** Sends a reserved digital account to the customer's email.
 * After successful delivery:
 * - delivery is marked as sent
 * - inventory is marked as sold
 * - order is marked as completed
 */
export const sendDigitalDeliveryEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        deliveryId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const {
      logAdminAction,
      notifyUser,
      telegramAlert,
    } = await import("./notify.server");

    const brevoApiKey = process.env["BREVO_API_KEY"];
    const from = process.env["BREVO_FROM_EMAIL"];

    if (!brevoApiKey || !from) {
      throw new Error(
        "Email provider is not configured. Add BREVO_API_KEY and BREVO_FROM_EMAIL server secrets.",
      );
    }

    // Get the pending delivery and its reserved inventory item.
    const { data: delivery, error: deliveryError } = await (
      supabaseAdmin.from("digital_deliveries" as any) as any
    )
      .select(`
        id,
        order_id,
        customer_email,
        product_name,
        delivery_status,
       digital_inventory (
  id,
  product_name,
  product_type,
  account_email,
  account_username,
  account_password,
  recovery_info,
  two_fa_info,
  qr_code,
  email_access_url,
  login_url,
  activation_url,
  download_url,
  plan_package,
  country_region,
  account_type,
  subscription_type,
  start_date,
  expiry_date,
  duration,
  renewal_date,
  warranty_period,
  warranty_start_date,
  warranty_expiry_date,
  warranty_status,
  replacement_eligible,
  customer_delivery_notes,
  status
)
      `)
      .eq("id", data.deliveryId)
      .eq("delivery_status", "pending")
      .maybeSingle();

    if (deliveryError) {
      throw new Error(deliveryError.message);
    }

    if (!delivery) {
      throw new Error(
        "Delivery not found or it has already been sent.",
      );
    }

    const inventory = delivery.digital_inventory;

    if (!inventory) {
      throw new Error(
        "Reserved inventory account was not found.",
      );
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const productName =
      delivery.product_name ||
      inventory.product_name ||
      "Digital Account";

    // Email HTML
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:700px;margin:auto">
        <h2>Your Digital Account Is Ready</h2>

        <p>
          Thank you for your purchase. Your digital account details are below:
        </p>

        <h3>Account Details</h3>

        <p>
          <strong>Product:</strong>
          ${escapeHtml(productName)}
        </p>

        <p>
          <strong>Account Email:</strong>
          ${escapeHtml(inventory.account_email)}
        </p>

        <p>
          <strong>Username:</strong>
          ${escapeHtml(inventory.account_username)}
        </p>

        <p>
          <strong>Password:</strong>
          ${escapeHtml(inventory.account_password)}
        </p>

        <p>
          <strong>Recovery Information:</strong><br>
          ${escapeHtml(inventory.recovery_info).replace(/\n/g, "<br>")}
        </p>

        ${
          inventory.notes
            ? `
              <p>
                <strong>Notes:</strong><br>
                ${escapeHtml(inventory.notes).replace(/\n/g, "<br>")}
              </p>
            `
            : ""
        }

        <p>
          Please keep these account details private and secure.
        </p>

        <p>
          Regards,<br>
          <strong>DIGITAL HUB GH</strong>
        </p>
      </div>
    `;

    // Plain text fallback
    const text = [
      "Your Digital Account Is Ready",
      "",
      `Product: ${productName}`,
      `Account Email: ${inventory.account_email || "—"}`,
      `Username: ${inventory.account_username || "—"}`,
      `Password: ${inventory.account_password || "—"}`,
      `Recovery Information: ${inventory.recovery_info || "—"}`,
      inventory.notes ? `Notes: ${inventory.notes}` : "",
      "",
      "Please keep these account details private and secure.",
      "",
      "DIGITAL HUB GH",
    ]
      .filter(Boolean)
      .join("\n");

    // Send email through Brevo.
    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "DigitalHub Ghana",
            email: from,
          },
          to: [
            {
              email: delivery.customer_email,
            },
          ],
          subject: `Your ${productName} is ready`,
          htmlContent: html,
          textContent: text,
        }),
      },
    );

    const { logMessage } = await import("./notify.server");
    const deliveryLogMeta = {
      message_type: "digital_delivered",
      template_key: "digital_delivered",
      source: "automated" as const,
      order_id: (delivery.order_id as string | null) ?? null,
      dedupe_key: `digital_delivered:${data.deliveryId}`,
    };

    if (!response.ok) {
      const detail = await response.text().catch(() => "");

      console.error(
        "Brevo email failed",
        response.status,
        detail,
      );

      await logMessage(deliveryLogMeta, {
        recipient: delivery.customer_email,
        subject: `Your ${productName} is ready`,
        body: text,
        status: "failed",
        error: `Email provider error (${response.status}).`,
      });

      throw new Error(
        "The email could not be sent. Check the Brevo configuration.",
      );
    }

    await logMessage(deliveryLogMeta, {
      recipient: delivery.customer_email,
      subject: `Your ${productName} is ready`,
      body: text,
      status: "sent",
    });

    /*
     * EMAIL SUCCESSFUL
     *
     * From this point forward we update the delivery,
     * inventory and order.
     */

    // 1. Mark digital delivery as SENT.
    const { error: deliveryUpdateError } = await (
      supabaseAdmin.from("digital_deliveries" as any) as any
    )
      .update({
        delivery_status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", delivery.id)
      .eq("delivery_status", "pending");

    if (deliveryUpdateError) {
      console.error(
        "Delivery status update failed:",
        deliveryUpdateError,
      );

      throw new Error(
        "Email was sent, but the delivery status could not be updated. Please check the order before sending again.",
      );
    }

    // 2. Mark the reserved digital inventory item as DELIVERED.
// The item has successfully been sent to the customer.
const { error: inventoryUpdateError } = await (
  supabaseAdmin.from("digital_inventory" as any) as any
)
  .update({
    status: "delivered",
    delivery_status: "delivered",
    date_sold: new Date().toISOString(),
  })
  .eq("id", inventory.id)
  .eq("status", "reserved");

if (inventoryUpdateError) {
  console.error(
    "Inventory delivery status update failed:",
    inventoryUpdateError,
  );

  throw new Error(
    "Email was sent, but the inventory item could not be marked as delivered.",
  );
}

    if (inventoryUpdateError) {
      console.error(
        "Inventory status update failed:",
        inventoryUpdateError,
      );

      throw new Error(
        "Email was sent, but the inventory item could not be marked as sold. Please update the inventory status before processing another delivery.",
      );
    }

    // 3. Mark the order as COMPLETED.
    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
      })
      .eq("id", delivery.order_id);

    if (orderUpdateError) {
      console.error(
        "Order completion failed:",
        orderUpdateError,
      );

      throw new Error(
        "Email was sent and inventory was marked sold, but the order could not be marked completed.",
      );
    }

    // 4. Add order status history.
    const { error: historyError } = await supabaseAdmin
      .from("order_status_history")
      .insert({
        order_id: delivery.order_id,
        status: "completed",
        note: "Digital product delivered successfully by email.",
      });

    if (historyError) {
      console.error(
        "Order history insert failed:",
        historyError,
      );
    }

    // 5. Notify customer that delivery is complete.
    try {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, user_id")
        .eq("id", delivery.order_id)
        .maybeSingle();

      if (order?.user_id) {
        await notifyUser({
          userId: order.user_id,
          title: `Order ${order.order_number} completed`,
          body: "Your digital product has been delivered to your email.",
          type: "order",
          link: `/dashboard/orders/${order.id}`,
        });

        await telegramAlert(
          `📦 <b>Digital delivery completed</b>\n${order.order_number}`,
        );
      }
    } catch (notificationError) {
      console.error(
        "Post-delivery notification failed:",
        notificationError,
      );
    }

    // 6. Record admin action.
    await logAdminAction({
      adminId,
      action: "digital_delivery_email_sent",
      targetType: "digital_delivery",
      targetId: delivery.id,
     description: `Digital delivery sent to ${delivery.customer_email}; inventory marked delivered and order completed.`,
    });

  return {
  ok: true,
  deliveryStatus: "sent",
  inventoryStatus: "delivered",
  orderStatus: "completed",
};
  });
