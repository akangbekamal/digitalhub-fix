import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getNotificationProviderStatus, sendTestAdminEmail } from "@/lib/admin.functions";
import type { Json } from "@/integrations/supabase/types";
import type { PaymentSettings } from "@/hooks/useSettings";

type Settings = {
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
};

const defaultSettings: Settings = {
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

const defaultPayment: Required<
  Pick<
    PaymentSettings,
    | "method_name"
    | "account_name"
    | "momo_number"
    | "instructions"
    | "reference_instructions"
    | "require_proof"
  >
> = {
  method_name: "Mobile Money",
  account_name: "",
  momo_number: "",
  instructions: "",
  reference_instructions: "",
  require_proof: false,
};

type AdminNotify = {
  website_enabled: boolean;
  email_enabled: boolean;
  email_address: string;
};

const defaultAdminNotify: AdminNotify = {
  website_enabled: true,
  email_enabled: false,
  email_address: "",
};

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const labelClass = "block space-y-1 text-sm font-medium text-foreground";

function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [payment, setPayment] = useState<PaymentSettings>(defaultPayment);
  const [adminNotify, setAdminNotify] = useState<AdminNotify>(defaultAdminNotify);
  const [emailReady, setEmailReady] = useState(false);
  const [testing, setTesting] = useState(false);
  const checkProvider = useServerFn(getNotificationProviderStatus);
  const runTestEmail = useServerFn(sendTestAdminEmail);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadSettings();
    void (async () => {
      try {
        const status = await checkProvider({ data: undefined });
        setEmailReady(status.email);
      } catch {
        setEmailReady(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("store_settings")
        .select("key, value");

      if (fetchError) throw fetchError;

      const loaded: Settings = { ...defaultSettings };
      let loadedPayment: PaymentSettings = { ...defaultPayment };
      let loadedNotify: AdminNotify = { ...defaultAdminNotify };

      for (const row of data ?? []) {
        if (row.key === "payment") {
          const value = row.value;
          if (value && typeof value === "object" && !Array.isArray(value)) {
            loadedPayment = { ...loadedPayment, ...(value as PaymentSettings) };
          }
          continue;
        }
        if (row.key === "admin_notify") {
          const value = row.value;
          if (value && typeof value === "object" && !Array.isArray(value)) {
            const v = value as Partial<AdminNotify>;
            loadedNotify = {
              website_enabled: v.website_enabled !== false,
              email_enabled: v.email_enabled === true,
              email_address: String(v.email_address ?? ""),
            };
          }
          continue;
        }
        if (!(row.key in loaded)) continue;
        const key = row.key as keyof Settings;

        if (key === "maintenance_mode") {
          loaded.maintenance_mode = row.value === true || row.value === "true";
        } else {
          loaded[key] = String(row.value ?? "") as never;
        }
      }

      setSettings(loaded);
      setPayment(loadedPayment);
      setAdminNotify(loadedNotify);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updatePayment<K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) {
    setPayment((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const rows: { key: string; value: Json }[] = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value as Json,
      }));
      rows.push({
        key: "payment",
        value: {
          ...payment,
          // Keep the legacy merchant-name key in sync for existing consumers.
          momo_name: payment.account_name || payment.momo_name || "",
        } as Json,
      });

      rows.push({ key: "admin_notify", value: { ...adminNotify } as Json });

      const { error: saveError } = await supabase
        .from("store_settings")
        .upsert(rows, { onConflict: "key" });

      if (saveError) throw saveError;


      setMessage("Settings saved successfully.");
      window.dispatchEvent(new Event("store-settings-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Website Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your contact information, social media links, and maintenance
          mode.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Contact Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span>Email address</span>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="support@digitalhubgh.com"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>Phone number</span>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+233 XX XXX XXXX"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>Address</span>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Your business address"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>WhatsApp number</span>
            <input
              type="tel"
              value={settings.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="+233 XX XXX XXXX"
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Social Media Links
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span>Facebook</span>
            <input
              type="url"
              value={settings.facebook}
              onChange={(e) => update("facebook", e.target.value)}
              placeholder="https://facebook.com/..."
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>Instagram</span>
            <input
              type="url"
              value={settings.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              placeholder="https://instagram.com/..."
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>X (Twitter)</span>
            <input
              type="url"
              value={settings.twitter}
              onChange={(e) => update("twitter", e.target.value)}
              placeholder="https://x.com/..."
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>TikTok</span>
            <input
              type="url"
              value={settings.tiktok}
              onChange={(e) => update("tiktok", e.target.value)}
              placeholder="https://tiktok.com/@..."
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>Telegram</span>
            <input
              type="url"
              value={settings.telegram}
              onChange={(e) => update("telegram", e.target.value)}
              placeholder="https://t.me/..."
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Checkout &amp; Payment Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          These details are shown to customers on the checkout page.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            <span>Payment method name</span>
            <input
              type="text"
              value={payment.method_name ?? ""}
              onChange={(e) => updatePayment("method_name", e.target.value)}
              placeholder="Telecel T-Cash"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>Account holder name</span>
            <input
              type="text"
              value={payment.account_name ?? ""}
              onChange={(e) => updatePayment("account_name", e.target.value)}
              placeholder="DIGITAL HUB GH"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>Payment number</span>
            <input
              type="tel"
              value={payment.momo_number ?? ""}
              onChange={(e) => updatePayment("momo_number", e.target.value)}
              placeholder="020 000 0000"
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span>Payment reference instructions (optional)</span>
            <input
              type="text"
              value={payment.reference_instructions ?? ""}
              onChange={(e) => updatePayment("reference_instructions", e.target.value)}
              placeholder="Use your order number as the reference"
              className={inputClass}
            />
          </label>

          <label className={`${labelClass} md:col-span-2`}>
            <span>Payment instructions shown to customers</span>
            <textarea
              value={payment.instructions ?? ""}
              onChange={(e) => updatePayment("instructions", e.target.value)}
              rows={4}
              placeholder="Send the exact total to the number above, then upload your payment screenshot."
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={payment.require_proof === true}
            onChange={(e) => updatePayment("require_proof", e.target.checked)}
            className="mt-1 size-4"
          />
          <span>
            <span className="block font-medium text-foreground">
              Require payment screenshot
            </span>
            <span className="block text-muted-foreground">
              Customers must upload a payment screenshot before they can place an
              order.
            </span>
          </span>
        </label>
      </section>



      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-foreground">Admin Notifications</h2>
        <p className="text-sm text-muted-foreground">
          New order alerts for staff only. These settings are private and are never visible to customers.
        </p>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={adminNotify.website_enabled}
            onChange={(e) => setAdminNotify((c) => ({ ...c, website_enabled: e.target.checked }))}
            className="mt-1 size-4"
          />
          <span>
            <span className="block font-medium text-foreground">Website notification</span>
            <span className="block text-muted-foreground">
              Show a new-order notification inside the admin dashboard.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={adminNotify.email_enabled}
            onChange={(e) => setAdminNotify((c) => ({ ...c, email_enabled: e.target.checked }))}
            className="mt-1 size-4"
          />
          <span>
            <span className="block font-medium text-foreground">Email order notifications</span>
            <span className="block text-muted-foreground">
              Send every new order to the private admin email address.
            </span>
          </span>
        </label>

        <label className={labelClass}>
          <span>Order notification email</span>
          <input
            type="email"
            value={adminNotify.email_address}
            onChange={(e) => setAdminNotify((c) => ({ ...c, email_address: e.target.value }))}
            placeholder="admin@yourdomain.com"
            className={inputClass}
          />
          <span className="block text-xs text-muted-foreground">
            This email is private and is only used to receive admin order notifications. Customers will never see it.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">
              {emailReady
                ? adminNotify.email_enabled && adminNotify.email_address
                  ? "Email notifications active"
                  : "Provider ready — enable and add an email address"
                : "Email provider not configured"}
            </span>
          </span>
          {emailReady && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testing}
              onClick={async () => {
                setTesting(true);
                setMessage("");
                setError("");
                try {
                  await runTestEmail({ data: undefined });
                  setMessage("Test email sent successfully.");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Test email could not be sent.");
                } finally {
                  setTesting(false);
                }
              }}
            >
              {testing ? "Sending…" : "Send test email"}
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 md:p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Maintenance Mode
        </h2>

        <div className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => update("maintenance_mode", e.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              <span className="block font-medium text-foreground">
                Enable maintenance mode
              </span>
              <span className="block text-muted-foreground">
                Turn this on when you want to temporarily disable access to the
                store.
              </span>
            </span>
          </label>

          <label className={labelClass}>
            <span>Maintenance message</span>
            <textarea
              value={settings.maintenance_message}
              onChange={(e) => update("maintenance_message", e.target.value)}
              rows={4}
              placeholder="We are currently performing maintenance. Please check back soon."
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="mr-2 size-4" />
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
