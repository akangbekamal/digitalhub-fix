// src/hooks/useSettings.tsx
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreSettings = {
  email: string;
  phone: string;
  address: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  telegram: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  name?: string;
  tagline?: string;
  hours?: string;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  email: "",
  phone: "",
  address: "",
  whatsapp: "",
  facebook: "",
  instagram: "",
  twitter: "",
  tiktok: "",
  telegram: "",
  maintenance_mode: false,
  maintenance_message:
    "We are currently performing maintenance. Please check back soon.",
};

const STRING_KEYS = [
  "email",
  "phone",
  "address",
  "whatsapp",
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "telegram",
  "maintenance_message",
  "name",
  "tagline",
  "hours",
] as const;

export type HomepageSettings = {
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta?: string;
  [key: string]: string | undefined;
};

export type PaymentSettings = {
  /** Payment method name shown at checkout, e.g. "Telecel T-Cash". */
  method_name?: string;
  /** Account holder / merchant name. */
  account_name?: string;
  momo_name?: string;
  momo_number?: string;
  momo_networks?: string[];
  instructions?: string;
  /** Optional extra note about what reference the customer should use. */
  reference_instructions?: string;
  /** When true, an order cannot be placed without a payment screenshot. */
  require_proof?: boolean;
};


export type ReferralSettings = {
  description?: string;
  reward_amount?: number;
};

export const settingsQueryKey = ["store_settings"] as const;

type SettingsResult = {
  settings: StoreSettings;
  extras: Record<string, unknown>;
  ok: boolean;
};

const EMPTY_RESULT: SettingsResult = {
  settings: DEFAULT_SETTINGS,
  extras: {},
  ok: false,
};

function toBool(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function toStr(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

export function toWhatsAppNumber(raw: string, defaultCountryCode = "233"): string {
  const digits = (raw || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if ((raw || "").trim().startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith(defaultCountryCode)) return digits;
  if (digits.startsWith("0")) return defaultCountryCode + digits.slice(1);
  return digits;
}

export function whatsappLink(raw: string, message?: string) {
  const n = toWhatsAppNumber(raw || "");
  if (!n) return null;
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function mailtoLink(email: string) {
  return email ? `mailto:${email}` : null;
}

export function telLink(phone: string) {
  const c = (phone || "").replace(/[^\d+]/g, "");
  return c ? `tel:${c}` : null;
}

/**
 * Never throws. A failing store_settings query degrades to DEFAULT_SETTINGS
 * so the public site (Home, Contact, Footer) keeps rendering.
 */
async function fetchSettings(): Promise<SettingsResult> {
  try {
    const { data, error } = await supabase
      .from("store_settings")
      .select("key, value");

    if (error) {
      console.warn("[useSettings] store_settings query failed:", error.message);
      return EMPTY_RESULT;
    }

    const settings: StoreSettings = { ...DEFAULT_SETTINGS };
    const extras: Record<string, unknown> = {};

    for (const row of data ?? []) {
      const key = String((row as { key: string }).key ?? "");
      if (!key) continue;
      const value = (row as { value: unknown }).value;

      if (key === "maintenance_mode") {
        settings.maintenance_mode = toBool(value);
        continue;
      }

      if ((STRING_KEYS as readonly string[]).includes(key)) {
        const text = toStr(value);
        if (key === "maintenance_message" && !text) continue;
        (settings as Record<string, unknown>)[key] = text;
        continue;
      }

      extras[key] = value;
    }

    return { settings, extras, ok: true };
  } catch (err) {
    console.warn("[useSettings] unexpected settings failure:", err);
    return EMPTY_RESULT;
  }
}

export function useStoreSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
    staleTime: 60_000,
    retry: false,
    // Guarantees `query.data` is always defined, even on the server render.
    placeholderData: EMPTY_RESULT,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey });
    };

    window.addEventListener("store-settings-updated", invalidate);

    // Realtime is optional: if the table is not in the realtime publication
    // (or the socket fails) the site must keep working.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("store_settings_public")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "store_settings" },
          invalidate,
        )
        .subscribe();
    } catch (err) {
      console.warn("[useSettings] realtime unavailable:", err);
      channel = null;
    }

    return () => {
      window.removeEventListener("store-settings-updated", invalidate);
      if (channel) {
        try {
          void supabase.removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, [queryClient]);

  const settings = query.data?.settings ?? DEFAULT_SETTINGS;
  const extras = query.data?.extras ?? {};

  return {
    settings,
    store: settings, // backwards-compatible alias for existing Footer/Header code
    homepage: (extras["homepage"] as HomepageSettings | undefined) ?? undefined,
    payment: (extras["payment"] as PaymentSettings | undefined) ?? undefined,
    referral: (extras["referral"] as ReferralSettings | undefined) ?? undefined,
    extras,
    isLoading: query.isLoading,
    isError: query.isError,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  };
}

export const useSettings = useStoreSettings;
