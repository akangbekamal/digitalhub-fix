import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Shared announcement engine.
 *
 * The `announcements` table drives every customer-facing notice. This module
 * owns the option lists, the eligibility rules and the dismissal storage so the
 * admin screen and the customer surfaces never drift apart.
 */

export const ANNOUNCEMENT_TYPES = [
  { value: "general", label: "General Notice", emoji: "📢" },
  { value: "price_update", label: "Price Update", emoji: "💰" },
  { value: "maintenance", label: "Maintenance", emoji: "🛠️" },
  { value: "service_delay", label: "Service Delay", emoji: "⏳" },
  { value: "new_product", label: "New Product", emoji: "🆕" },
  { value: "promotion", label: "Promotion", emoji: "🎁" },
  { value: "important", label: "Important Notice", emoji: "⚠️" },
  { value: "order_update", label: "Order Update", emoji: "📦" },
  { value: "service_restored", label: "Service Restored", emoji: "✅" },
] as const;

export const PRIORITIES = [
  { value: "normal", label: "Normal" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
] as const;

export const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
] as const;

export const DISPLAY_SCOPES = [
  { value: "site", label: "Entire Website" },
  { value: "homepage", label: "Homepage" },
  { value: "dashboard", label: "Customer Dashboard" },
  { value: "product", label: "Specific Product" },
  { value: "category", label: "Specific Category" },
  { value: "provider", label: "Specific Network / Provider" },
  { value: "order", label: "Specific Order Page" },
] as const;

/** Where an announcement may be rendered. */
export const PLACEMENTS = [
  { value: "homepage", label: "Homepage" },
  { value: "dashboard", label: "Customer Dashboard" },
  { value: "product", label: "Product / Service Page" },
  { value: "order", label: "Order Page" },
  { value: "checkout", label: "Checkout" },
  { value: "orders", label: "Orders Page" },
  { value: "notification", label: "Notification Center" },
  { value: "banner", label: "Top Banner" },
  { value: "popup", label: "Popup / Modal" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
] as const;

export const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "logged_in", label: "Logged-in Customers" },
  { value: "new_customers", label: "New Customers" },
  { value: "active_orders", label: "Customers With Active Orders" },
  { value: "service_customers", label: "Customers Who Purchased a Specific Service" },
] as const;

export const POPUP_FREQUENCIES = [
  { value: "once", label: "Once per customer" },
  { value: "daily", label: "Once per day" },
  { value: "always", label: "Every visit" },
  { value: "until_dismissed", label: "Until dismissed" },
] as const;

export const NOTIFICATION_CHANNEL_PRESETS = [
  { value: "none", label: "Don't send notification", channels: [] as string[] },
  { value: "inapp", label: "In-app notification", channels: ["inapp"] },
  { value: "email", label: "Email", channels: ["email"] },
  { value: "sms", label: "SMS", channels: ["sms"] },
  { value: "inapp_email", label: "In-app + Email", channels: ["inapp", "email"] },
  { value: "inapp_sms", label: "In-app + SMS", channels: ["inapp", "sms"] },
  { value: "all", label: "All available channels", channels: ["inapp", "email", "sms"] },
] as const;

export type Placement = (typeof PLACEMENTS)[number]["value"];

export type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority_level: string;
  status: string;
  display_scope: string;
  placements: string[];
  audience: string;
  target_product_ids: string[];
  target_category_ids: string[];
  target_provider_tags: string[];
  dismissible: boolean;
  pinned: boolean;
  cta_text: string | null;
  cta_url: string | null;
  popup_frequency: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  created_at: string;
};

export const SELECT_COLUMNS =
  "id, title, message, type, priority_level, status, display_scope, placements, audience, target_product_ids, target_category_ids, target_provider_tags, dismissible, pinned, cta_text, cta_url, popup_frequency, starts_at, ends_at, priority, created_at";

export function typeMeta(value: string) {
  return ANNOUNCEMENT_TYPES.find((t) => t.value === value) ?? ANNOUNCEMENT_TYPES[0];
}

export function label(list: readonly { value: string; label: string }[], value: string) {
  return list.find((i) => i.value === value)?.label ?? value;
}

/** A published row can still be "scheduled" or "expired" in real time. */
export function effectiveStatus(a: { status: string; starts_at: string | null; ends_at: string | null }) {
  const now = Date.now();
  if (a.status !== "published") return a.status;
  if (a.starts_at && new Date(a.starts_at).getTime() > now) return "scheduled";
  if (a.ends_at && new Date(a.ends_at).getTime() < now) return "expired";
  return "published";
}

const LOCAL_KEY = "dhgh-dismissed-announcements";
const POPUP_KEY = "dhgh-seen-announcement-popups";

function readMap(key: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeMap(key: string, value: Record<string, string>) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function localDismissed(): string[] {
  if (typeof window === "undefined") return [];
  return Object.keys(readMap(LOCAL_KEY));
}

export function rememberLocalDismissal(id: string) {
  if (typeof window === "undefined") return;
  writeMap(LOCAL_KEY, { ...readMap(LOCAL_KEY), [id]: new Date().toISOString() });
}

export function popupAlreadyShown(id: string, frequency: string) {
  if (typeof window === "undefined") return true;
  if (frequency === "always") return false;
  const seen = readMap(POPUP_KEY)[id];
  if (!seen) return false;
  if (frequency === "daily") return new Date(seen).toDateString() === new Date().toDateString();
  return true;
}

export function rememberPopupShown(id: string) {
  if (typeof window === "undefined") return;
  writeMap(POPUP_KEY, { ...readMap(POPUP_KEY), [id]: new Date().toISOString() });
}

export function trackAnnouncement(id: string, event: "view" | "dismiss" | "cta") {
  void supabase.rpc("track_announcement_event", { _announcement_id: id, _event: event });
}

export type AnnouncementContext = {
  productId?: string | undefined;
  categoryId?: string | undefined;
  providerTags?: string[] | undefined;
};

/** Does this announcement's targeting match the page the customer is on? */
export function matchesContext(a: Announcement, ctx: AnnouncementContext) {
  const hasProductTarget = a.target_product_ids.length > 0;
  const hasCategoryTarget = a.target_category_ids.length > 0;
  const hasProviderTarget = a.target_provider_tags.length > 0;
  if (!hasProductTarget && !hasCategoryTarget && !hasProviderTarget) return true;

  const providerHit = hasProviderTarget
    ? (ctx.providerTags ?? []).some((tag) =>
        a.target_provider_tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
      )
    : false;
  const productHit = hasProductTarget && ctx.productId ? a.target_product_ids.includes(ctx.productId) : false;
  const categoryHit = hasCategoryTarget && ctx.categoryId ? a.target_category_ids.includes(ctx.categoryId) : false;
  return providerHit || productHit || categoryHit;
}

/** Live announcements for one placement, already filtered for this visitor. */
export function useAnnouncements(placement: Placement, ctx: AnnouncementContext = {}) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => setDismissed(localDismissed()), []);

  const query = useQuery({
    queryKey: ["active-announcements"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from("announcements")
        .select(SELECT_COLUMNS)
        .eq("status", "published")
        .order("pinned", { ascending: false })
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return (data ?? []) as Announcement[];
    },
  });

  const remoteDismissals = useQuery({
    queryKey: ["announcement-dismissals", user?.id],
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("announcement_dismissals").select("announcement_id");
      if (error) return [];
      return (data ?? []).map((r) => r.announcement_id);
    },
  });

  // Audience rules that need extra data are resolved once, lazily.
  const activeOrders = useQuery({
    queryKey: ["has-active-orders", user?.id],
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, created_at")
        .not("status", "in", "(delivered,cancelled,refunded,completed)")
        .limit(1);
      return (data ?? []).length > 0;
    },
  });

  const createdAt = useAuth().profile?.created_at as string | undefined;

  return useMemo(() => {
    const all = query.data ?? [];
    const hidden = new Set([...dismissed, ...(remoteDismissals.data ?? [])]);
    return all.filter((a) => {
      if (effectiveStatus(a) !== "published") return false;
      if (!a.placements.includes(placement)) return false;
      if (hidden.has(a.id)) return false;
      if (!matchesContext(a, ctx)) return false;
      if (a.audience === "logged_in" && !user) return false;
      if (a.audience === "active_orders" && !activeOrders.data) return false;
      if (a.audience === "new_customers") {
        if (!createdAt) return false;
        const days = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
        if (days > 30) return false;
      }
      return true;
    });
    // ctx is a fresh object each render; depend on its parts instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query.data,
    dismissed,
    remoteDismissals.data,
    activeOrders.data,
    user,
    createdAt,
    placement,
    ctx.productId,
    ctx.categoryId,
    (ctx.providerTags ?? []).join(","),
  ]);
}

/** Records a dismissal for this announcement only — never for all announcements. */
export async function dismissAnnouncement(id: string, userId: string | undefined) {
  rememberLocalDismissal(id);
  trackAnnouncement(id, "dismiss");
  if (userId) {
    await supabase.from("announcement_dismissals").upsert(
      { announcement_id: id, user_id: userId },
      { onConflict: "announcement_id,user_id" },
    );
  }
}
