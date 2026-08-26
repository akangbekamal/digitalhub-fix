import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { adminCategoriesQuery, adminProductsQuery } from "@/lib/admin-data";
import { money, slugify } from "@/lib/format";
import { adjustInventory } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "Catalog — DIGITAL HUB GH Admin" },
      { name: "description", content: "Create and edit products, categories and stock levels." },
      { property: "og:title", content: "Catalog — DIGITAL HUB GH Admin" },
      { property: "og:description", content: "Create and edit products, categories and stock levels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

type Draft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  discount_price: string;
  category_id: string;
  stock: string;
  unlimited_stock: boolean;
  product_type: string;
  delivery_info: string;
  image_url: string;
  is_active: boolean;
  is_featured: boolean;
};

const EMPTY: Draft = {
  name: "",
  description: "",
  price: "",
  discount_price: "",
  category_id: "",
  stock: "0",
  unlimited_stock: true,
  product_type: "instant",
  delivery_info: "Delivered instantly after payment verification.",
  image_url: "",
  is_active: true,
  is_featured: false,
};

function Page() {
  const qc = useQueryClient();
  const products = useQuery(adminProductsQuery());
  const categories = useQuery(adminCategoriesQuery());
  const runStock = useServerFn(adjustInventory);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [catName, setCatName] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: slugify(draft.name),
        description: draft.description.trim(),
        price: Number(draft.price),
        discount_price: draft.discount_price ? Number(draft.discount_price) : null,
        category_id: draft.category_id || null,
        stock: Number(draft.stock) || 0,
        unlimited_stock: draft.unlimited_stock,
        product_type: draft.product_type,
        delivery_info: draft.delivery_info.trim(),
        image_url: draft.image_url.trim() || null,
        is_active: draft.is_active,
        is_featured: draft.is_featured,
      };
      const { error } = draft.id
        ? await supabase.from("products").update(payload).eq("id", draft.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
      toast.success(draft.id ? "Product updated" : "Product created");
      setDraft(EMPTY);
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restock = async (productId: string, newStock: number) => {
    try {
      await runStock({ data: { productId, newStock, reason: "Manual restock from admin" } });
      toast.success("Stock updated");
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const addCategory = async () => {
    if (!catName.trim()) return;
    const { error } = await supabase
      .from("categories")
      .insert({ name: catName.trim(), slug: slugify(catName), sort_order: (categories.data ?? []).length + 1 });
    if (error) toast.error(error.message);
    else {
      setCatName("");
      toast.success("Category added");
      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Catalog</h1>
      <p className="mt-2 text-muted-foreground">Manage your products, pricing, stock and categories.</p>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-6">
          <form onSubmit={save} className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
            <h2 className="font-display text-lg font-semibold sm:col-span-2">
              {draft.id ? "Edit product" : "New product"}
            </h2>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={draft.category_id} onValueChange={(v) => setDraft({ ...draft, category_id: v })}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price">Price (GH₵)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="discount">Discount price (optional)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                min="0"
                value={draft.discount_price}
                onChange={(e) => setDraft({ ...draft, discount_price: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="delivery">Delivery info</Label>
              <Input
                id="delivery"
                value={draft.delivery_info}
                onChange={(e) => setDraft({ ...draft, delivery_info: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="image">Image URL or storage path</Label>
              <Input id="image" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={draft.stock}
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                disabled={draft.unlimited_stock}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={draft.unlimited_stock}
                  onCheckedChange={(v) => setDraft({ ...draft, unlimited_stock: v })}
                />
                Unlimited stock
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.is_featured} onCheckedChange={(v) => setDraft({ ...draft, is_featured: v })} />
                Featured
              </label>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" aria-hidden />}
                {draft.id ? "Save product" : "Create product"}
              </Button>
              {draft.id && (
                <Button type="button" variant="ghost" onClick={() => setDraft(EMPTY)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          {products.isLoading ? (
            <LoadingState />
          ) : products.isError ? (
            <ErrorState message={(products.error as Error).message} />
          ) : (
            <ul className="space-y-2">
              {(products.data ?? []).map((p) => (
                <li key={p.id} className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.name} {!p.is_active && <span className="text-xs text-muted-foreground">(hidden)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.categories?.name ?? "Uncategorised"} · {money(p.discount_price ?? p.price)} ·{" "}
                      {p.unlimited_stock ? "Unlimited" : `${p.stock} in stock`} · {p.sold_count} sold
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!p.unlimited_stock && (
                      <Input
                        type="number"
                        min="0"
                        defaultValue={p.stock}
                        className="w-24"
                        aria-label={`Stock for ${p.name}`}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== p.stock) void restock(p.id, v);
                        }}
                      />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setDraft({
                          id: p.id,
                          name: p.name,
                          description: p.description,
                          price: String(p.price),
                          discount_price: p.discount_price === null ? "" : String(p.discount_price),
                          category_id: p.category_id ?? "",
                          stock: String(p.stock),
                          unlimited_stock: p.unlimited_stock,
                          product_type: p.product_type,
                          delivery_info: p.delivery_info,
                          image_url: p.image_url ?? "",
                          is_active: p.is_active,
                          is_featured: p.is_featured,
                        })
                      }
                    >
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="surface-panel flex flex-wrap gap-2 p-4">
            <Input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="New category name"
              className="max-w-xs"
            />
            <Button type="button" onClick={() => void addCategory()}>
              <Plus className="mr-2 size-4" aria-hidden /> Add
            </Button>
          </div>
          <ul className="space-y-2">
            {(categories.data ?? []).map((c) => (
              <li key={c.id} className="surface-panel flex items-center justify-between gap-3 p-4">
                <span className="font-medium">{c.name}</span>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  Active
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={async (v) => {
                      const { error } = await supabase.from("categories").update({ is_active: v }).eq("id", c.id);
                      if (error) toast.error(error.message);
                      await qc.invalidateQueries({ queryKey: ["admin-categories"] });
                    }}
                  />
                </label>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
