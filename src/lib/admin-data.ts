import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Staff-only reads. Row-level security still requires a staff role for every one of these. */

export const adminOrdersQuery = () =>
  queryOptions({
    queryKey: ["admin-orders"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_email, customer_phone, total, status, payment_status, created_at, customer_note, admin_note, order_items(id, product_name, quantity, line_total)",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminPaymentsQuery = () =>
  queryOptions({
    queryKey: ["admin-payments"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, order_id, amount, method, reference, sender_number, proof_path, status, admin_note, created_at, orders(order_number, customer_name, customer_phone)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminProductsQuery = () =>
  queryOptions({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminCategoriesQuery = () =>
  queryOptions({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

export type CustomerStatus = "active" | "suspended" | "deactivated";

export type AdminCustomer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  account_status: CustomerStatus;
  admin_note: string | null;
  referral_code: string | null;
  created_at: string;
  roles: string[];
};

/**
 * Customers come from `profiles` (every signup has a row), never from orders.
 * Optional columns (`account_status`, `admin_note`, `is_banned`) may be absent
 * on older databases, so the query falls back to the guaranteed columns instead
 * of failing the whole page.
 */
export const adminCustomersQuery = (statusFilter: "all" | CustomerStatus = "all", search = "") =>
  queryOptions({
    queryKey: ["admin-customers", statusFilter, search],
    refetchOnMount: "always",
    queryFn: async (): Promise<AdminCustomer[]> => {
      const BASE = "id, full_name, email, phone, referral_code, created_at";
      const FULL = `${BASE}, account_status, is_banned, admin_note`;

      type Row = Record<string, unknown>;
      let rows: Row[] = [];

      let attempt = await supabase
        .from("profiles")
        .select(FULL)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (attempt.error) {
        // Older database: retry with only the columns that certainly exist.
        const fallback = await supabase
          .from("profiles")
          .select(BASE)
          .order("created_at", { ascending: false })
          .limit(2000);
        if (fallback.error) throw fallback.error;
        rows = (fallback.data ?? []) as Row[];
      } else {
        rows = (attempt.data ?? []) as Row[];
      }

      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
      if (rolesError) throw rolesError;
      const roleMap = new Map<string, string[]>();
      for (const r of roles ?? []) roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);

      const customers: AdminCustomer[] = rows.map((p) => {
        const status = (p["account_status"] as CustomerStatus | undefined) ?? (p["is_banned"] === true ? "suspended" : "active");
        const id = String(p["id"]);
        return {
          id,
          full_name: String(p["full_name"] ?? ""),
          email: (p["email"] as string | null) ?? null,
          phone: (p["phone"] as string | null) ?? null,
          account_status: status,
          admin_note: (p["admin_note"] as string | null) ?? null,
          referral_code: (p["referral_code"] as string | null) ?? null,
          created_at: String(p["created_at"]),
          roles: roleMap.get(id) ?? [],
        };
      });

      const term = search.trim().toLowerCase();
      return customers.filter(
        (c) =>
          (statusFilter === "all" || c.account_status === statusFilter) &&
          (!term ||
            c.full_name.toLowerCase().includes(term) ||
            (c.email ?? "").toLowerCase().includes(term) ||
            (c.phone ?? "").toLowerCase().includes(term)),
      );
    },
  });




      return Array.from(customers.values());
    },
  });

export const adminTicketsQuery = () =>
  queryOptions({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      // Do not join the nonexistent `profiles` table. Ticket messages still
      // work through user_id; customer identity can be shown from orders when needed.
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, subject, category, priority, status, created_at, updated_at, user_id")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminReviewsQuery = () =>
  queryOptions({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, title, body, status, created_at, products(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminRefundsQuery = () =>
  queryOptions({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("refunds")
        .select("id, amount, reason, status, admin_note, created_at, orders(order_number)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminCouponsQuery = () =>
  queryOptions({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminAnnouncementsQuery = () =>
  queryOptions({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
