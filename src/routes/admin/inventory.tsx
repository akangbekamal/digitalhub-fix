import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { supabase } from "@/integrations/supabase/client";
import {
  getDigitalInventoryAdminData,
  saveDigitalInventory,
  deleteDigitalInventory,
} from "@/lib/inventory.functions";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({
    meta: [
      { title: "Digital Inventory — DIGITAL HUB GH Admin" },
      {
        name: "description",
        content: "Manage digital products and account inventory.",
      },
    ],
  }),
  component: Page,
});

type InventoryStatus =
  | "available"
  | "reserved"
  | "sold"
  | "delivered"
  | "expired"
  | "suspended"
  | "refunded"
  | "disabled";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  product_type: string | null;
  price: number;
};

type Supplier = {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  supplier_contact: string | null;
  supplier_notes: string | null;
  is_active: boolean;
};

type AccessLink = {
  id?: string;
  link_name: string;
  link_type: string;
  url: string;
  sort_order: number;
};

type InventoryItem = {
  id: string;
  inventory_id: string | null;
  product_id: string | null;
  product_name: string;
  product_type: string;
  product_category: string | null;
  product_sku: string | null;
  description: string | null;

  account_email: string | null;
  account_username: string | null;
  account_password: string | null;
  recovery_info: string | null;
  two_fa_info: string | null;

  qr_code: string | null;
  email_access_url: string | null;
  login_url: string | null;
  activation_url: string | null;
  download_url: string | null;

  plan_package: string | null;
  country_region: string | null;
  account_type: string | null;
  subscription_type: string | null;
  start_date: string | null;
  expiry_date: string | null;
  duration: string | null;
  renewal_date: string | null;

  status: InventoryStatus;
  quantity: number | null;

  supplier_id: string | null;
  supplier_cost: number | null;
  purchase_date: string | null;
  purchase_reference: string | null;

  order_id: string | null;
  order_item_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  selling_price: number | null;
  discount: number | null;
  final_selling_price: number | null;
  date_sold: string | null;
  payment_status: string | null;
  delivery_status: string | null;

  warranty_period: string | null;
  warranty_start_date: string | null;
  warranty_expiry_date: string | null;
  warranty_status: string | null;
  replacement_eligible: boolean | null;

  staff_notes: string | null;
  account_notes: string | null;
  special_instructions: string | null;
  supplier_notes: string | null;
  customer_delivery_notes: string | null;

  profit: number | null;

  access_links?: AccessLink[];

  created_at: string;
  updated_at: string;
};

type Draft = {
  id?: string;
  inventory_id?: string;
  created_at?: string;
  updated_at?: string;

  product_id: string;
  product_name: string;
  product_type: string;
  product_category: string;
  product_sku: string;
  description: string;

  account_email: string;
  account_username: string;
  account_password: string;
  recovery_info: string;
  two_fa_info: string;

  qr_code: string;
  email_access_url: string;
  login_url: string;
  activation_url: string;
  download_url: string;

  plan_package: string;
  country_region: string;
  account_type: string;
  subscription_type: string;
  start_date: string;
  expiry_date: string;
  duration: string;
  renewal_date: string;

  status: InventoryStatus;
  quantity: string;

  supplier_id: string;
  supplier_name: string;
  supplier_contact: string;
  supplier_cost: string;
  purchase_date: string;
  purchase_reference: string;
  supplier_notes: string;

  selling_price: string;
  discount: string;

  warranty_period: string;
  warranty_start_date: string;
  warranty_expiry_date: string;
  warranty_status: string;
  replacement_eligible: boolean;

  staff_notes: string;
  account_notes: string;
  special_instructions: string;
  customer_delivery_notes: string;

  access_links: AccessLink[];
};

const EMPTY: Draft = {
  inventory_id: "",
  created_at: "",
  updated_at: "",

  product_id: "",
  product_name: "",
  product_type: "Account",
  product_category: "",
  product_sku: "",
  description: "",

  account_email: "",
  account_username: "",
  account_password: "",
  recovery_info: "",
  two_fa_info: "",

  qr_code: "",
  email_access_url: "",
  login_url: "",
  activation_url: "",
  download_url: "",

  plan_package: "",
  country_region: "",
  account_type: "",
  subscription_type: "",
  start_date: "",
  expiry_date: "",
  duration: "",
  renewal_date: "",

  status: "available",
  quantity: "1",

  supplier_id: "",
  supplier_name: "",
  supplier_contact: "",
  supplier_cost: "",
  purchase_date: "",
  purchase_reference: "",
  supplier_notes: "",

  selling_price: "",
  discount: "",

  warranty_period: "",
  warranty_start_date: "",
  warranty_expiry_date: "",
  warranty_status: "not_started",
  replacement_eligible: true,

  staff_notes: "",
  account_notes: "",
  special_instructions: "",
  customer_delivery_notes: "",

  access_links: [],
};

const statuses: InventoryStatus[] = [
  "available",
  "reserved",
  "sold",
  "delivered",
  "expired",
  "suspended",
  "refunded",
  "disabled",
];

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-background p-5">
      <div className="mb-5">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function Page() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | InventoryStatus>("all");

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );

  const query = useQuery({
    queryKey: ["digital-inventory-admin", statusFilter],

    queryFn: async () => {
      return await getDigitalInventoryAdminData({
        data: { status: statusFilter === "all" ? undefined : statusFilter },
      });
    },

  });

  const products = (query.data?.products ?? []) as Product[];
  const suppliers = (query.data?.suppliers ?? []) as Supplier[];
  const inventory = (query.data?.inventory ?? []) as InventoryItem[];

  const setField = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addAccessLink = () => {
    setDraft((current) => ({
      ...current,
      access_links: [
        ...current.access_links,
        {
          link_name: "",
          link_type: "other",
          url: "",
          sort_order: current.access_links.length,
        },
      ],
    }));
  };

  const updateAccessLink = (
    index: number,
    field: keyof AccessLink,
    value: string | number,
  ) => {
    setDraft((current) => ({
      ...current,
      access_links: current.access_links.map((link, i) =>
        i === index ? { ...link, [field]: value } : link,
      ),
    }));
  };

  const removeAccessLink = (index: number) => {
    setDraft((current) => ({
      ...current,
      access_links: current.access_links.filter((_, i) => i !== index),
    }));
  };

  const selectProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);

    if (!product) {
      setField("product_id", "");
      return;
    }

    setDraft((current) => ({
      ...current,
      product_id: product.id,
      product_name: product.name,
      product_type: product.product_type || current.product_type,
      product_sku: product.sku || "",
      selling_price:
        current.selling_price || String(Number(product.price ?? 0)),
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!draft.product_name.trim()) {
      toast.error("Enter a product name.");
      return;
    }

    if (!draft.product_type.trim()) {
      toast.error("Enter a product type.");
      return;
    }

    setBusy(true);

    try {
      await saveDigitalInventory({
        data: {
          ...draft,
          quantity: Number(draft.quantity || 1),
          supplier_cost: draft.supplier_cost
            ? Number(draft.supplier_cost)
            : null,
          selling_price: draft.selling_price
            ? Number(draft.selling_price)
            : null,
          discount: draft.discount ? Number(draft.discount) : 0,
        },
      });


      toast.success(
        draft.id
          ? "Inventory item updated successfully."
          : "Inventory item added successfully.",
      );

      setDraft(EMPTY);
      setShowForm(false);

      await qc.invalidateQueries({
        queryKey: ["digital-inventory-admin"],
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const editItem = (item: InventoryItem) => {
    setDraft({
      id: item.id,
      inventory_id: item.inventory_id ?? "",
      created_at: item.created_at ?? "",
      updated_at: item.updated_at ?? "",

      product_id: item.product_id ?? "",
      product_name: item.product_name,
      product_type: item.product_type,
      product_category: item.product_category ?? "",
      product_sku: item.product_sku ?? "",
      description: item.description ?? "",

      account_email: item.account_email ?? "",
      account_username: item.account_username ?? "",
      account_password: item.account_password ?? "",
      recovery_info: item.recovery_info ?? "",
      two_fa_info: item.two_fa_info ?? "",

      qr_code: item.qr_code ?? "",
      email_access_url: item.email_access_url ?? "",
      login_url: item.login_url ?? "",
      activation_url: item.activation_url ?? "",
      download_url: item.download_url ?? "",

      plan_package: item.plan_package ?? "",
      country_region: item.country_region ?? "",
      account_type: item.account_type ?? "",
      subscription_type: item.subscription_type ?? "",
      start_date: item.start_date ?? "",
      expiry_date: item.expiry_date ?? "",
      duration: item.duration ?? "",
      renewal_date: item.renewal_date ?? "",

      status: item.status,
      quantity: String(item.quantity ?? 1),

      supplier_id: item.supplier_id ?? "",
      supplier_name:
        suppliers.find((supplier) => supplier.id === item.supplier_id)?.supplier_name ?? "",
      supplier_contact:
        suppliers.find((supplier) => supplier.id === item.supplier_id)?.supplier_contact ?? "",
      supplier_cost:
        item.supplier_cost !== null && item.supplier_cost !== undefined
          ? String(item.supplier_cost)
          : "",
      purchase_date: item.purchase_date ?? "",
      purchase_reference: item.purchase_reference ?? "",
      supplier_notes: item.supplier_notes ?? "",

      selling_price:
        item.selling_price !== null && item.selling_price !== undefined
          ? String(item.selling_price)
          : "",
      discount:
        item.discount !== null && item.discount !== undefined
          ? String(item.discount)
          : "",

      warranty_period: item.warranty_period ?? "",
      warranty_start_date: item.warranty_start_date ?? "",
      warranty_expiry_date: item.warranty_expiry_date ?? "",
      warranty_status: item.warranty_status ?? "not_started",
      replacement_eligible: item.replacement_eligible ?? true,

      staff_notes: item.staff_notes ?? "",
      account_notes: item.account_notes ?? "",
      special_instructions: item.special_instructions ?? "",
      customer_delivery_notes: item.customer_delivery_notes ?? "",

      access_links: item.access_links ?? [],
    });

    setShowForm(true);
  };

  const deleteItem = async (item: InventoryItem) => {
    if (item.status !== "available") {
      toast.error("Only available inventory can be deleted.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${item.product_name}" from your inventory?`,
    );

    if (!confirmed) return;

    try {
      await deleteDigitalInventory({
        inventoryId: item.id,
      });

      toast.success("Inventory item deleted.");

      await qc.invalidateQueries({
        queryKey: ["digital-inventory-admin"],
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const items = inventory.filter((item) => {
    const term = search.trim().toLowerCase();

    if (!term) return true;

    return [
      item.inventory_id ?? "",
      item.product_name,
      item.product_type,
      item.product_category ?? "",
      item.product_sku ?? "",
      item.account_email ?? "",
      item.account_username ?? "",
      item.customer_name ?? "",
      item.customer_email ?? "",
      item.staff_notes ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const statusVariant = (status: InventoryStatus) => {
    if (status === "available") return "default" as const;
    if (status === "sold" || status === "delivered") return "secondary" as const;
    return "outline" as const;
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Digital Inventory
          </h1>

          <p className="mt-2 text-muted-foreground">
            Manage digital accounts, subscriptions, codes, links and stock.
          </p>
        </div>

        <Button
          onClick={() => {
            setDraft(EMPTY);
            setShowForm(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          Add Digital Product
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory ID, product, email, customer..."
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | InventoryStatus)
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>

          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <section className="surface-panel mt-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {draft.id ? "Edit Digital Product" : "Add Digital Product"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                These details are for staff/admin use only.
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowForm(false);
                setDraft(EMPTY);
              }}
            >
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={save} className="mt-6 grid gap-5">
            {/* BASIC INFORMATION */}
            <Section
              title="📦 Basic Information"
              description="Identify the actual stock item and the product it belongs to."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Inventory ID">
                  <Input
                    value={
                      draft.inventory_id ||
                      (draft.id && draft.inventory_id
                        ? draft.inventory_id
                        : "Automatic — generated when saved")
                    }
                    disabled
                    readOnly
                  />
                </Field>

                <Field label="Product">
                  <select
                    value={draft.product_id}
                    onChange={(e) => selectProduct(e.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select existing product</option>

                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.sku ? ` — ${product.sku}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Product Name">
                  <Input
                    value={draft.product_name}
                    onChange={(e) => setField("product_name", e.target.value)}
                    placeholder="Netflix Premium"
                  />
                </Field>

                <Field label="Product Type">
                  <Input
                    value={draft.product_type}
                    onChange={(e) => setField("product_type", e.target.value)}
                    placeholder="Account / Subscription / Code"
                  />
                </Field>

                <Field label="Category">
                  <Input
                    value={draft.product_category}
                    onChange={(e) =>
                      setField("product_category", e.target.value)
                    }
                    placeholder="Streaming"
                  />
                </Field>

                <Field label="SKU">
                  <Input
                    value={draft.product_sku}
                    onChange={(e) => setField("product_sku", e.target.value)}
                    placeholder="SKU"
                  />
                </Field>

                <Field label="Description" className="md:col-span-2">
                  <Textarea
                    value={draft.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={3}
                    placeholder="Describe this inventory item..."
                  />
                </Field>
              </div>
            </Section>

            {/* CREDENTIALS */}
            <Section
              title="🔐 Credentials"
              description="Sensitive account information. Staff/admin only."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Email / Number">
                  <Input
                    value={draft.account_email}
                    onChange={(e) =>
                      setField("account_email", e.target.value)
                    }
                    placeholder="account@example.com"
                  />
                </Field>

                <Field label="Username">
                  <Input
                    value={draft.account_username}
                    onChange={(e) =>
                      setField("account_username", e.target.value)
                    }
                    placeholder="Username"
                  />
                </Field>

                <Field label="Password">
                  <div className="relative">
                    <Input
                      type={showFormPassword ? "text" : "password"}
                      value={draft.account_password}
                      onChange={(e) =>
                        setField("account_password", e.target.value)
                      }
                      placeholder="Account password"
                      className="pr-10"
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowFormPassword((prev) => !prev)}
                      aria-label={
                        showFormPassword ? "Hide password" : "Show password"
                      }
                      title={showFormPassword ? "Hide password" : "Show password"}
                      className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
                    >
                      {showFormPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </Field>

                <Field label="2FA Information">
                  <Input
                    value={draft.two_fa_info}
                    onChange={(e) =>
                      setField("two_fa_info", e.target.value)
                    }
                    placeholder="2FA details"
                  />
                </Field>

                <Field label="Recovery Information" className="md:col-span-2">
                  <Textarea
                    value={draft.recovery_info}
                    onChange={(e) =>
                      setField("recovery_info", e.target.value)
                    }
                    rows={4}
                    placeholder="Recovery email, recovery codes, phone, etc."
                  />
                </Field>
              </div>
            </Section>

            {/* ACCESS */}
            <Section
              title="🔗 QR & Access"
              description="Store the URLs customers may need after delivery."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="QR Code">
                  <Input
                    value={draft.qr_code}
                    onChange={(e) => setField("qr_code", e.target.value)}
                    placeholder="QR code value or image URL"
                  />
                </Field>

                <Field label="Email Access URL">
                  <Input
                    value={draft.email_access_url}
                    onChange={(e) =>
                      setField("email_access_url", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </Field>

                <Field label="Login URL">
                  <Input
                    value={draft.login_url}
                    onChange={(e) => setField("login_url", e.target.value)}
                    placeholder="https://..."
                  />
                </Field>

                <Field label="Activation URL">
                  <Input
                    value={draft.activation_url}
                    onChange={(e) =>
                      setField("activation_url", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </Field>

                <Field label="Download URL">
                  <Input
                    value={draft.download_url}
                    onChange={(e) =>
                      setField("download_url", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Additional Links</p>
                    <p className="text-sm text-muted-foreground">
                      Add multiple named access links.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAccessLink}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Link
                  </Button>
                </div>

                <div className="mt-4 grid gap-3">
                  {draft.access_links.map((link, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-lg bg-muted/30 p-3 md:grid-cols-[1fr_150px_2fr_auto]"
                    >
                      <Input
                        value={link.link_name}
                        onChange={(e) =>
                          updateAccessLink(
                            index,
                            "link_name",
                            e.target.value,
                          )
                        }
                        placeholder="Link name"
                      />

                      <select
                        value={link.link_type}
                        onChange={(e) =>
                          updateAccessLink(
                            index,
                            "link_type",
                            e.target.value,
                          )
                        }
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="login">Login</option>
                        <option value="activation">Activation</option>
                        <option value="download">Download</option>
                        <option value="email">Email</option>
                        <option value="other">Other</option>
                      </select>

                      <Input
                        value={link.url}
                        onChange={(e) =>
                          updateAccessLink(index, "url", e.target.value)
                        }
                        placeholder="https://..."
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAccessLink(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* ACCOUNT */}
            <Section title="📋 Account">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Plan / Package">
                  <Input
                    value={draft.plan_package}
                    onChange={(e) =>
                      setField("plan_package", e.target.value)
                    }
                    placeholder="Premium"
                  />
                </Field>

                <Field label="Country / Region">
                  <Input
                    value={draft.country_region}
                    onChange={(e) =>
                      setField("country_region", e.target.value)
                    }
                    placeholder="Ghana"
                  />
                </Field>

                <Field label="Account Type">
                  <Input
                    value={draft.account_type}
                    onChange={(e) =>
                      setField("account_type", e.target.value)
                    }
                    placeholder="Shared / Private"
                  />
                </Field>

                <Field label="Subscription Type">
                  <Input
                    value={draft.subscription_type}
                    onChange={(e) =>
                      setField("subscription_type", e.target.value)
                    }
                    placeholder="Monthly"
                  />
                </Field>

                <Field label="Start Date">
                  <Input
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setField("start_date", e.target.value)}
                  />
                </Field>

                <Field label="Expiry Date">
                  <Input
                    type="date"
                    value={draft.expiry_date}
                    onChange={(e) => setField("expiry_date", e.target.value)}
                  />
                </Field>

                <Field label="Duration">
                  <Input
                    value={draft.duration}
                    onChange={(e) => setField("duration", e.target.value)}
                    placeholder="30 days"
                  />
                </Field>

                <Field label="Renewal Date">
                  <Input
                    type="date"
                    value={draft.renewal_date}
                    onChange={(e) => setField("renewal_date", e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            {/* STOCK */}
            <Section title="📦 Stock">
              <div className="grid gap-5 md:grid-cols-3">
                <Field label="Status">
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setField(
                        "status",
                        e.target.value as InventoryStatus,
                      )
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Quantity">
                  <Input
                    type="number"
                    min="1"
                    value={draft.quantity}
                    onChange={(e) => setField("quantity", e.target.value)}
                  />
                </Field>

                <Field label="Date Added">
                  <Input
                    value={
                      draft.created_at
                        ? new Date(draft.created_at).toLocaleString()
                        : "Automatic after saving"
                    }
                    disabled
                    readOnly
                  />
                </Field>

                <Field label="Last Updated">
                  <Input
                    value={
                      draft.updated_at
                        ? new Date(draft.updated_at).toLocaleString()
                        : "Automatic after saving"
                    }
                    disabled
                    readOnly
                  />
                </Field>

                <Field label="Selling Price">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.selling_price}
                    onChange={(e) =>
                      setField("selling_price", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Discount">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.discount}
                    onChange={(e) => setField("discount", e.target.value)}
                    placeholder="0.00"
                  />
                </Field>
              </div>
            </Section>

            {/* SUPPLIER */}
            <Section
              title="🏪 Supplier"
              description="Supplier information is staff/admin only."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Supplier">
                  <select
                    value={draft.supplier_id}
                    onChange={(e) => {
                      const supplier = suppliers.find(
                        (s) => s.id === e.target.value,
                      );

                      setDraft((current) => ({
                        ...current,
                        supplier_id: e.target.value,
                        supplier_name: supplier?.supplier_name ?? "",
                        supplier_contact:
                          supplier?.supplier_contact ?? "",
                      }));
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">No supplier selected</option>

                    {suppliers
                      .filter((supplier) => supplier.is_active)
                      .map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.supplier_name}
                        </option>
                      ))}
                  </select>
                </Field>

                <Field label="Supplier Name">
                  <Input
                    value={draft.supplier_name}
                    onChange={(e) =>
                      setField("supplier_name", e.target.value)
                    }
                    placeholder="Supplier name"
                  />
                </Field>

                <Field label="Supplier Contact">
                  <Input
                    value={draft.supplier_contact}
                    onChange={(e) =>
                      setField("supplier_contact", e.target.value)
                    }
                    placeholder="Phone / Email"
                  />
                </Field>

                <Field label="Supplier Cost">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.supplier_cost}
                    onChange={(e) =>
                      setField("supplier_cost", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </Field>

                <Field label="Purchase Date">
                  <Input
                    type="date"
                    value={draft.purchase_date}
                    onChange={(e) =>
                      setField("purchase_date", e.target.value)
                    }
                  />
                </Field>

                <Field label="Purchase Reference">
                  <Input
                    value={draft.purchase_reference}
                    onChange={(e) =>
                      setField("purchase_reference", e.target.value)
                    }
                    placeholder="Invoice / reference"
                  />
                </Field>

                <Field label="Supplier Notes" className="md:col-span-2">
                  <Textarea
                    value={draft.supplier_notes}
                    onChange={(e) =>
                      setField("supplier_notes", e.target.value)
                    }
                    rows={3}
                    placeholder="Private supplier notes..."
                  />
                </Field>
              </div>
            </Section>

            {/* WARRANTY */}
            <Section title="🛡️ Warranty">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Warranty Period">
                  <Input
                    value={draft.warranty_period}
                    onChange={(e) =>
                      setField("warranty_period", e.target.value)
                    }
                    placeholder="7 Days"
                  />
                </Field>

                <Field label="Warranty Status">
                  <select
                    value={draft.warranty_status}
                    onChange={(e) =>
                      setField("warranty_status", e.target.value)
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="claimed">Claimed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </Field>

                <Field label="Warranty Start Date">
                  <Input
                    type="date"
                    value={draft.warranty_start_date}
                    onChange={(e) =>
                      setField("warranty_start_date", e.target.value)
                    }
                  />
                </Field>

                <Field label="Warranty Expiry Date">
                  <Input
                    type="date"
                    value={draft.warranty_expiry_date}
                    onChange={(e) =>
                      setField("warranty_expiry_date", e.target.value)
                    }
                  />
                </Field>

                <label className="flex items-center gap-3 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={draft.replacement_eligible}
                    onChange={(e) =>
                      setField("replacement_eligible", e.target.checked)
                    }
                    className="size-4"
                  />

                  <span className="text-sm">
                    Replacement eligible
                  </span>
                </label>
              </div>
            </Section>

            {/* NOTES */}
            <Section
              title="📝 Internal"
              description="These notes are not automatically shown to customers."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Staff Notes">
                  <Textarea
                    value={draft.staff_notes}
                    onChange={(e) =>
                      setField("staff_notes", e.target.value)
                    }
                    rows={4}
                  />
                </Field>

                <Field label="Account Notes">
                  <Textarea
                    value={draft.account_notes}
                    onChange={(e) =>
                      setField("account_notes", e.target.value)
                    }
                    rows={4}
                  />
                </Field>

                <Field label="Special Instructions">
                  <Textarea
                    value={draft.special_instructions}
                    onChange={(e) =>
                      setField("special_instructions", e.target.value)
                    }
                    rows={4}
                  />
                </Field>

                <Field label="Customer Delivery Notes">
                  <Textarea
                    value={draft.customer_delivery_notes}
                    onChange={(e) =>
                      setField("customer_delivery_notes", e.target.value)
                    }
                    rows={4}
                  />
                </Field>
              </div>
            </Section>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setDraft(EMPTY);
                }}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={busy}>
                {busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}

                {draft.id ? "Save Changes" : "Add Product"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {query.isLoading ? (
        <div className="mt-8">
          <LoadingState label="Loading digital inventory…" />
        </div>
      ) : query.isError ? (
        <div className="mt-8">
          <ErrorState
            message={(query.error as Error)?.message}
            onRetry={() => void query.refetch()}
          />
        </div>
      ) : items.length === 0 ? (
        <section className="surface-panel mt-8 p-10 text-center">
          <h2 className="font-display text-lg font-semibold">
            No inventory found
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Add your first digital product to get started.
          </p>
        </section>
      ) : (
        <div className="mt-8 grid gap-4">
          {items.map((item) => {
            const passwordVisible = Boolean(showPasswords[item.id]);

            return (
              <section key={item.id} className="surface-panel p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold">
                        {item.product_name}
                      </h2>

                      <Badge variant={statusVariant(item.status)}>
                        {item.status}
                      </Badge>

                      {item.inventory_id && (
                        <Badge variant="outline">
                          {item.inventory_id}
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.product_type}
                      {item.product_sku
                        ? ` • ${item.product_sku}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editItem(item)}
                    >
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </Button>

                    {item.status === "available" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void deleteItem(item)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Account Email
                    </p>
                    <p className="mt-1 break-all text-sm">
                      {item.account_email || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Username
                    </p>
                    <p className="mt-1 break-all text-sm">
                      {item.account_username || "—"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Password
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((current) => ({
                            ...current,
                            [item.id]: !current[item.id],
                          }))
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {passwordVisible ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>

                    <p className="mt-1 break-all font-mono text-sm">
                      {passwordVisible
                        ? item.account_password || "—"
                        : item.account_password
                          ? "••••••••••••"
                          : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Expiry
                    </p>
                    <p className="mt-1 text-sm">
                      {item.expiry_date || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Selling Price
                    </p>
                    <p className="mt-1 text-sm">
                      {item.selling_price !== null
                        ? `GH₵ ${Number(item.selling_price).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Supplier Cost
                    </p>
                    <p className="mt-1 text-sm">
                      {item.supplier_cost !== null
                        ? `GH₵ ${Number(item.supplier_cost).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Profit
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {item.profit !== null
                        ? `GH₵ ${Number(item.profit).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Warranty
                    </p>
                    <p className="mt-1 text-sm">
                      {item.warranty_period || "—"}
                    </p>
                  </div>
                </div>

                {(item.login_url ||
                  item.activation_url ||
                  item.download_url ||
                  item.email_access_url ||
                  item.qr_code) && (
                  <div className="mt-5 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="size-4" />
                      <p className="font-medium">Access</p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        ["Email", item.email_access_url],
                        ["Login", item.login_url],
                        ["Activation", item.activation_url],
                        ["Download", item.download_url],
                      ].map(([name, url]) =>
                        url ? (
                          <a
                            key={name}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
                          >
                            {name}
                            <ExternalLink className="ml-2 size-3" />
                          </a>
                        ) : null,
                      )}
                    </div>
                  </div>
                )}

                {item.customer_name && (
                  <div className="mt-4 rounded-lg bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Assigned Customer
                    </p>

                    <p className="mt-1 text-sm">
                      {item.customer_name}
                      {item.customer_email
                        ? ` • ${item.customer_email}`
                        : ""}
                    </p>
                  </div>
                )}

                {item.staff_notes && (
                  <div className="mt-4 rounded-lg bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Staff Notes
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {item.staff_notes}
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
