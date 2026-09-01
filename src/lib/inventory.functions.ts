import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireStaff(context: {
  supabase: { rpc: Function };
  userId: string;
}) {
  const { data } = await (
    context.supabase.rpc as (
      name: string,
      args: unknown,
    ) => Promise<{ data: unknown }>
  )("is_staff", {
    _user_id: context.userId,
  });

  if (data !== true) {
    throw new Error("Forbidden: staff access required.");
  }

  return context.userId;
}

const inventorySchema = z.object({
  id: z.string().uuid().optional(),

  product_id: z.string().uuid().optional().or(z.literal("")),
  product_name: z.string(),
  product_type: z.string(),
  product_category: z.string(),
  product_sku: z.string(),
  description: z.string(),

  account_email: z.string(),
  account_username: z.string(),
  account_password: z.string(),
  recovery_info: z.string(),
  two_fa_info: z.string(),

  qr_code: z.string(),
  email_access_url: z.string(),
  login_url: z.string(),
  activation_url: z.string(),
  download_url: z.string(),

  plan_package: z.string(),
  country_region: z.string(),
  account_type: z.string(),
  subscription_type: z.string(),
  start_date: z.string(),
  expiry_date: z.string(),
  duration: z.string(),
  renewal_date: z.string(),

  status: z.string(),
  quantity: z.number(),

  supplier_id: z.string().uuid().optional().or(z.literal("")),
  supplier_name: z.string(),
  supplier_contact: z.string(),
  supplier_cost: z.number().nullable(),
  purchase_date: z.string(),
  purchase_reference: z.string(),
  supplier_notes: z.string(),

  selling_price: z.number().nullable(),
  discount: z.number(),

  warranty_period: z.string(),
  warranty_start_date: z.string(),
  warranty_expiry_date: z.string(),
  warranty_status: z.string(),
  replacement_eligible: z.boolean(),

  staff_notes: z.string(),
  account_notes: z.string(),
  special_instructions: z.string(),
  customer_delivery_notes: z.string(),

  access_links: z.array(
    z.object({
      id: z.string().uuid().optional(),
      link_name: z.string(),
      link_type: z.string(),
      url: z.string(),
      sort_order: z.number(),
    }),
  ),
});

const nullableText = (value: string) =>
  value.trim() === "" ? null : value.trim();

const nullableDate = (value: string) =>
  value.trim() === "" ? null : value;

export const getDigitalInventoryAdminData = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      status: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let inventoryQuery = supabaseAdmin
      .from("digital_inventory")
      .select("*")
      .order("created_at", { ascending: false });

    if (data.status) {
      inventoryQuery = inventoryQuery.eq("status", data.status);
    }

    const [
      inventoryResult,
      productsResult,
      suppliersResult,
      linksResult,
    ] = await Promise.all([
      inventoryQuery,
      supabaseAdmin
        .from("products")
        .select("id,name,sku,product_type,price")
        .order("name"),
      supabaseAdmin
        .from("inventory_suppliers")
        .select(
          "id,supplier_id,supplier_name,supplier_contact,supplier_notes,is_active",
        )
        .order("supplier_name"),
      supabaseAdmin
        .from("inventory_access_links")
        .select("id,inventory_id,link_name,link_type,url,sort_order")
        .order("sort_order"),
    ]);

    if (inventoryResult.error) {
      throw new Error(inventoryResult.error.message);
    }

    if (productsResult.error) {
      throw new Error(productsResult.error.message);
    }

    if (suppliersResult.error) {
      throw new Error(suppliersResult.error.message);
    }

    if (linksResult.error) {
      throw new Error(linksResult.error.message);
    }

    const linksByInventory = new Map<string, any[]>();

    for (const link of linksResult.data ?? []) {
      const existing = linksByInventory.get(link.inventory_id) ?? [];
      existing.push(link);
      linksByInventory.set(link.inventory_id, existing);
    }

    const inventory = (inventoryResult.data ?? []).map((item: any) => ({
      ...item,
      access_links: linksByInventory.get(item.id) ?? [],
    }));

    return {
      inventory,
      products: productsResult.data ?? [],
      suppliers: suppliersResult.data ?? [],
    };
  });

export const saveDigitalInventory = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(inventorySchema)
  .handler(async ({ data, context }) => {
    const adminId = await requireStaff(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let supplierId =
      data.supplier_id && data.supplier_id !== ""
        ? data.supplier_id
        : null;

    /*
     * Create/update supplier when supplier information is supplied.
     */
    if (data.supplier_name.trim()) {
      if (supplierId) {
        const { error } = await supabaseAdmin
          .from("inventory_suppliers")
          .update({
            supplier_name: data.supplier_name.trim(),
            supplier_contact: nullableText(data.supplier_contact),
            supplier_notes: nullableText(data.supplier_notes),
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", supplierId);

        if (error) throw new Error(error.message);
      } else {
        const { data: supplier, error } = await supabaseAdmin
          .from("inventory_suppliers")
          .insert({
            supplier_name: data.supplier_name.trim(),
            supplier_contact: nullableText(data.supplier_contact),
            supplier_notes: nullableText(data.supplier_notes),
            is_active: true,
          })
          .select("id")
          .single();

        if (error) throw new Error(error.message);

        supplierId = supplier.id;
      }
    }

    const sellingPrice = data.selling_price ?? 0;
    const discount = data.discount ?? 0;
    const finalSellingPrice = Math.max(
      0,
      sellingPrice - discount,
    );

    // NOTE: digital_inventory.profit is a GENERATED column in the database
    // (final_selling_price - supplier_cost). It must never be written to.



    const payload = {
      product_id:
        data.product_id && data.product_id !== ""
          ? data.product_id
          : null,

      product_name: data.product_name.trim(),
      product_type: data.product_type.trim(),
      product_category: nullableText(data.product_category),
      product_sku: nullableText(data.product_sku),
      description: nullableText(data.description),

      account_email: nullableText(data.account_email),
      account_username: nullableText(data.account_username),
      account_password:
        data.account_password.trim() === ""
          ? null
          : data.account_password,
      recovery_info: nullableText(data.recovery_info),
      two_fa_info: nullableText(data.two_fa_info),

      qr_code: nullableText(data.qr_code),
      email_access_url: nullableText(data.email_access_url),
      login_url: nullableText(data.login_url),
      activation_url: nullableText(data.activation_url),
      download_url: nullableText(data.download_url),

      plan_package: nullableText(data.plan_package),
      country_region: nullableText(data.country_region),
      account_type: nullableText(data.account_type),
      subscription_type: nullableText(data.subscription_type),
      start_date: nullableDate(data.start_date),
      expiry_date: nullableDate(data.expiry_date),
      duration: nullableText(data.duration),
      renewal_date: nullableDate(data.renewal_date),

      status: data.status,
      quantity: Math.max(1, data.quantity),

      supplier_id: supplierId,
      supplier_cost:
        data.supplier_cost !== null
          ? data.supplier_cost
          : null,
      purchase_date: nullableDate(data.purchase_date),
      purchase_reference: nullableText(data.purchase_reference),

      selling_price: data.selling_price,
      discount,
      final_selling_price: finalSellingPrice,


      warranty_period: nullableText(data.warranty_period),
      warranty_start_date: nullableDate(
        data.warranty_start_date,
      ),
      warranty_expiry_date: nullableDate(
        data.warranty_expiry_date,
      ),
      warranty_status:
        data.warranty_status || "not_started",
      replacement_eligible:
        data.replacement_eligible,

      staff_notes: nullableText(data.staff_notes),
      account_notes: nullableText(data.account_notes),
      special_instructions: nullableText(
        data.special_instructions,
      ),
      supplier_notes: nullableText(data.supplier_notes),
      customer_delivery_notes: nullableText(
        data.customer_delivery_notes,
      ),
    };

    const makeInventoryId = () => {
      const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
      return `INV-${date}-${suffix}`;
    };

    let inventoryId: string;

    if (data.id) {
      const updatePayload = {
        ...payload,
        inventory_id: makeInventoryId(),
      };

      const { data: existingItem, error: existingItemError } = await supabaseAdmin
        .from("digital_inventory")
        .select("inventory_id")
        .eq("id", data.id)
        .single();

      if (existingItemError) throw new Error(existingItemError.message);

      const { data: updated, error } = await supabaseAdmin
        .from("digital_inventory")
        .update(existingItem.inventory_id ? payload : updatePayload)
        .eq("id", data.id)
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      inventoryId = updated.id;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("digital_inventory")
        .insert({
          ...payload,
          inventory_id: makeInventoryId(),
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);

      inventoryId = created.id;
    }

    /*
     * Purchase record.
     */
    if (
      data.supplier_cost !== null &&
      data.purchase_date
    ) {
      const { data: existingPurchase } =
        await supabaseAdmin
          .from("inventory_purchases")
          .select("id")
          .eq("inventory_id", inventoryId)
          .maybeSingle();

      const purchasePayload = {
        inventory_id: inventoryId,
        supplier_id: supplierId,
        supplier_cost: data.supplier_cost,
        purchase_date: data.purchase_date,
        purchase_reference:
          nullableText(data.purchase_reference),
        notes: nullableText(data.supplier_notes),
      };

      if (existingPurchase) {
        const { error } = await supabaseAdmin
          .from("inventory_purchases")
          .update(purchasePayload)
          .eq("id", existingPurchase.id);

        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabaseAdmin
          .from("inventory_purchases")
          .insert(purchasePayload);

        if (error) throw new Error(error.message);
      }
    }

    /*
     * Warranty record.
     */
    const { data: existingWarranty } =
      await supabaseAdmin
        .from("inventory_warranties")
        .select("id")
        .eq("inventory_id", inventoryId)
        .maybeSingle();

    const warrantyPayload = {
      inventory_id: inventoryId,
      warranty_period:
        nullableText(data.warranty_period),
      warranty_start_date:
        nullableDate(data.warranty_start_date),
      warranty_expiry_date:
        nullableDate(data.warranty_expiry_date),
      status:
        data.warranty_status || "not_started",
      replacement_eligible:
        data.replacement_eligible,
    };

    if (existingWarranty) {
      const { error } = await supabaseAdmin
        .from("inventory_warranties")
        .update(warrantyPayload)
        .eq("id", existingWarranty.id);

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("inventory_warranties")
        .insert(warrantyPayload);

      if (error) throw new Error(error.message);
    }

    /*
     * Replace additional access links.
     */
    const { error: deleteLinksError } =
      await supabaseAdmin
        .from("inventory_access_links")
        .delete()
        .eq("inventory_id", inventoryId);

    if (deleteLinksError) {
      throw new Error(deleteLinksError.message);
    }

    const links = data.access_links
      .filter(
        (link) =>
          link.link_name.trim() &&
          link.url.trim(),
      )
      .map((link, index) => ({
        inventory_id: inventoryId,
        link_name: link.link_name.trim(),
        link_type: link.link_type.trim() || "other",
        url: link.url.trim(),
        sort_order: index,
      }));

    if (links.length) {
      const { error } = await supabaseAdmin
        .from("inventory_access_links")
        .insert(links);

      if (error) throw new Error(error.message);
    }

    /*
     * Activity log + private admin alert for newly added inventory.
     * Credentials are never included in the email.
     */
    const { logAdminAction, notifyInventoryAdded, checkDigitalLowStock } = await import("./notify.server");
    await logAdminAction({
      adminId,
      action: data.id ? "inventory_edited" : "inventory_added",
      targetType: "digital_inventory",
      targetId: inventoryId,
      description: `${payload.product_name} (${payload.status})`,
    });

    if (!data.id) {
      const { data: created } = await supabaseAdmin
        .from("digital_inventory")
        .select("inventory_id")
        .eq("id", inventoryId)
        .maybeSingle();
      await notifyInventoryAdded([
        {
          inventoryId: (created?.inventory_id as string | null) ?? inventoryId,
          productName: payload.product_name,
          quantity: payload.quantity,
        },
      ]);
    }

    await checkDigitalLowStock(payload.product_name);

    return {
      ok: true,
      inventoryId,
      adminId,
    };
  });

export const deleteDigitalInventory = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      inventoryId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: inventory, error: lookupError } =
      await supabaseAdmin
        .from("digital_inventory")
        .select("id,status")
        .eq("id", data.inventoryId)
        .maybeSingle();

    if (lookupError) {
      throw new Error(lookupError.message);
    }

    if (!inventory) {
      throw new Error("Inventory item not found.");
    }

    if (inventory.status !== "available") {
      throw new Error(
        "Only available inventory can be deleted.",
      );
    }

    const { error } = await supabaseAdmin
      .from("digital_inventory")
      .delete()
      .eq("id", data.inventoryId)
      .eq("status", "available");

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });
