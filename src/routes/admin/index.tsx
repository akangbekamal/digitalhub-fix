import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { getAdminStats } from "@/lib/admin.functions";
import { money } from "@/lib/format";

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

function Page() {
  const run = useServerFn(getAdminStats);
  const query = useQuery({ queryKey: ["admin-stats"], queryFn: () => run({}) });

  if (query.isLoading) return <LoadingState label="Crunching your numbers…" />;
  if (query.isError || !query.data)
    return <ErrorState message={(query.error as Error)?.message} onRetry={() => void query.refetch()} />;

  const s = query.data;
  const cards = [
    { label: "Revenue (verified)", value: money(s.revenue) },
    { label: "Average order", value: money(s.avgOrderValue) },
    { label: "Orders", value: String(s.totalOrders) },
    { label: "Awaiting payment review", value: String(s.pendingPayments) },
    { label: "Customers", value: String(s.customers) },
    { label: "Active products", value: `${s.activeProducts}/${s.products}` },
    { label: "Open tickets", value: String(s.openTickets) },
    { label: "Reviews pending", value: String(s.pendingReviews) },
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
