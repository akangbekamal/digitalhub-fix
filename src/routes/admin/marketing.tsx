import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/StateBlocks";
import { adminCouponsQuery } from "@/lib/admin-data";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { money } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/marketing")({
  head: () => ({
    meta: [
      { title: "Coupons & Announcements — DIGITAL HUB GH Admin" },
      { name: "description", content: "Run discounts and broadcast store news to customers." },
      { property: "og:title", content: "Coupons & Announcements — DIGITAL HUB GH Admin" },
      { property: "og:description", content: "Run discounts and broadcast store news to customers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const section = useRouterState({ select: (s) => s.location.hash });
  const [tab, setTab] = useState("coupons");
  useEffect(() => { if (section === "coupons" || section === "news") setTab(section); }, [section]);
  const qc = useQueryClient();
  const coupons = useQuery(adminCouponsQuery());

  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");

  const addCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("coupons").insert({
      code: code.trim().toUpperCase(),
      discount_type: type,
      discount_value: Number(value),
      min_order: Number(minOrder) || 0,
      is_active: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setCode("");
    toast.success("Coupon created");
    await qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Coupons & announcements</h1>
      <p className="mt-2 text-muted-foreground">Discounts are validated on the server at checkout.</p>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="news">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-4 space-y-4">
          <form onSubmit={addCoupon} className="surface-panel grid gap-4 p-5 sm:grid-cols-4">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </div>
            <div>
              <Label htmlFor="value">Value</Label>
              <Input id="value" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="min">Minimum order</Label>
              <Input id="min" type="number" min="0" step="0.01" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            </div>
            <Button type="submit" className="sm:col-span-4 sm:w-fit">
              <Plus className="mr-2 size-4" aria-hidden /> Create coupon
            </Button>
          </form>

          {coupons.isLoading ? (
            <LoadingState rows={2} />
          ) : (
            <ul className="space-y-2">
              {(coupons.data ?? []).map((c) => (
                <li key={c.id} className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-display font-semibold">{c.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.discount_type === "percent" ? `${c.discount_value}% off` : `${money(c.discount_value)} off`} · min{" "}
                      {money(c.min_order)} · used {c.used_count}
                      {c.max_uses ? `/${c.max_uses}` : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    Active
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={async (v) => {
                        const { error } = await supabase.from("coupons").update({ is_active: v }).eq("id", c.id);
                        if (error) toast.error(error.message);
                        await qc.invalidateQueries({ queryKey: ["admin-coupons"] });
                      }}
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          <AnnouncementManager />
        </TabsContent>

      </Tabs>
    </div>
  );
}
