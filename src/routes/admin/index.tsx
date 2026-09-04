import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { getAdminStats } from "@/lib/admin.functions";
import { money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Overview — DIGITAL HUB GH" },
      { name: "description", content: "Revenue, orders and store health at a glance." },
      { property: "og:title", content: "Admin Overview — DIGITAL HUB GH" },
      { property: "og:description", content: "Revenue, orders and store health at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const PRESETS = ["Today", "Last 7 days", "Last 30 days", "This year", "Custom"] as const;
type Preset = (typeof PRESETS)[number];

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export function presetRange(preset: Preset, customFrom: string, customTo: string) {
  const today = new Date().toISOString().slice(0, 10);
  switch (preset) {
    case "Today":
      return { from: today, to: today };
    case "Last 7 days":
      return { from: isoDaysAgo(6), to: today };
    case "Last 30 days":
      return { from: isoDaysAgo(29), to: today };
    case "This year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "Custom":
      return { from: customFrom || isoDaysAgo(29), to: customTo || today };
  }
}

function Page() {
  const run = useServerFn(getAdminStats);
  const [preset, setPreset] = useState<Preset>("Last 30 days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const range = useMemo(() => presetRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const query = useQuery({
    queryKey: ["admin-stats", range.from, range.to],
    queryFn: () => run({ data: { from: range.from, to: range.to } }),
  });

  if (query.isLoading) return <LoadingState label="Crunching your numbers…" />;
  if (query.isError || !query.data)
    return <ErrorState message={(query.error as Error)?.message} onRetry={() => void query.refetch()} />;

  const s = query.data;
  const cards = [
    { label: "Today's revenue", value: money(s.todayRevenue) },
    { label: "Total revenue (verified)", value: money(s.revenue) },
    { label: "Today's orders", value: String(s.todayOrders) },
    { label: "Total orders", value: String(s.totalOrders) },
    { label: "Pending orders", value: String(s.pendingOrders) },
    { label: "Pending payments", value: String(s.pendingPayments) },
    { label: "Completed orders", value: String(s.completedOrders) },
    { label: "Total customers", value: String(s.customers) },
    { label: "Total products", value: `${s.activeProducts}/${s.products}` },
    { label: "Low inventory", value: String(s.lowStock.length) },
    { label: "Unread support tickets", value: String(s.openTickets) },
    { label: "Failed payments", value: String(s.failedPayments) },
  ];

  const pending = [
    { label: "Payments awaiting verification", count: s.pendingActions.paymentsToVerify, to: "/admin/orders" },
    { label: "Orders awaiting fulfilment", count: s.pendingActions.ordersToFulfil, to: "/admin/orders" },
    { label: "Failed payments", count: s.pendingActions.failedPayments, to: "/admin/orders" },
    { label: "Low-stock products", count: s.pendingActions.lowStock, to: "/admin/products" },
    { label: "Unanswered support tickets", count: s.pendingActions.unansweredTickets, to: "/admin/support" },
    { label: "Pending reviews", count: s.pendingActions.pendingReviews, to: "/admin/support" },
    { label: "Refund requests", count: s.pendingActions.refundRequests, to: "/admin/orders" },
  ];

  const peak = Math.max(1, ...s.revenueSeries.map((d) => d.revenue));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Overview</h1>
      <p className="mt-2 text-muted-foreground">Live figures straight from your store database.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="surface-panel p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="surface-panel mt-8 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold">Performance</h2>
          <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
            {PRESETS.map((p) => (
              <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => setPreset(p)}>
                {p}
              </Button>
            ))}
          </div>
        </div>
        {preset === "Custom" && (
          <div className="mt-3 grid gap-2 text-sm sm:flex sm:flex-wrap sm:items-center">
            <Input type="date" className="w-full sm:w-auto" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-muted-foreground">to</span>
            <Input type="date" className="w-full sm:w-auto" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Revenue", value: money(s.range.revenue) },
            { label: "Orders", value: String(s.range.orders) },
            { label: "Average order", value: money(s.range.avgOrderValue) },
            { label: "Completed", value: String(s.range.completed) },
            { label: "Cancelled", value: String(s.range.cancelled) },
            { label: "Refunded", value: String(s.range.refunded) },
          ].map((c) => (
            <div key={c.label}>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-display text-xl font-bold">{c.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">Revenue — last 30 days</h2>
        <div className="mt-4 flex h-32 items-end gap-1">
          {s.revenueSeries.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${money(d.revenue)}`}
              className="flex-1 rounded-t bg-primary/60"
              style={{ height: `${Math.max(2, (d.revenue / peak) * 100)}%` }}
            />
          ))}
        </div>
      </section>

      <section className="surface-panel mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">Recent orders</h2>
        {s.recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Order</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="py-2 font-medium">#{o.order_number}</td>
                    <td>{o.customer_name}</td>
                    <td className="max-w-[200px] truncate">{o.products}</td>
                    <td>{money(o.total)}</td>
                    <td className="capitalize">{o.payment_status}</td>
                    <td className="capitalize">{o.status}</td>
                    <td>{shortDate(o.created_at)}</td>
                    <td className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/admin/orders">
                          Open
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface-panel mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">Pending actions</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {pending.map((p) => (
            <li key={p.label}>
              <Link
                to={p.to}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <span>{p.label}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", p.count > 0 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground")}>
                  {p.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="surface-panel p-5">
          <h2 className="font-display text-lg font-semibold">Low stock</h2>
          {s.lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Everything is well stocked.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {s.lowStock.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span className="line-clamp-1">{p.name}</span>
                  <span className="font-semibold text-warning">{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="surface-panel p-5">
          <h2 className="font-display text-lg font-semibold">Best sellers</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {s.topProducts.map((p) => (
              <li key={p.name} className="flex justify-between gap-3">
                <span className="line-clamp-1">{p.name}</span>
                <span className="font-semibold">{p.sold} sold</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
