import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** All account queries run through the browser client, so row-level security scopes them to the signed-in user. */

export const myOrdersQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-orders", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, status, payment_status, created_at, order_items(id, product_name, quantity)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const myOrderQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["my-order", orderId],
    queryFn: async () => {
      const [{ data: order, error }, { data: items }, { data: payments }, { data: history }, { data: refund }] =
        await Promise.all([
          supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
          supabase.from("order_items").select("*").eq("order_id", orderId),
          supabase.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
          supabase
            .from("order_status_history")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true }),
          supabase.from("refunds").select("*").eq("order_id", orderId).maybeSingle(),
        ]);
      if (error) throw error;
      return {
        order,
        items: items ?? [],
        payment: payments?.[0] ?? null,
        history: history ?? [],
        refund: refund ?? null,
      };
    },
  });

export const myDownloadsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-downloads", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select(
          "id, download_count, max_downloads, expires_at, is_active, file_path, created_at, products(name, slug, product_type, delivery_info), orders(order_number)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const myNotificationsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-notifications", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

export const myTicketsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-tickets", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, category, priority, status, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const ticketMessagesQuery = (ticketId: string | null) =>
  queryOptions({
    queryKey: ["ticket-messages", ticketId],
    enabled: Boolean(ticketId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("id, message, is_staff_reply, created_at")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const myReferralsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-referrals", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("id, status, reward_amount, created_at")
        .eq("referrer_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
