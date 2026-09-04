import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { getAdminStats } from "@/lib/admin.functions";
import { money } from "@/lib/format";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — DIGITAL HUB GH" },
      { name: "description", content: "Revenue, order and customer analytics from live store data." },
      { property: "og:title", content: "Analytics — DIGITAL HUB GH" },
      { property: "og:description", content: "Revenue, order and customer analytics from live store data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const PRESETS = ["Last 7 days", "Last 30 days", "Last 90 days", "This year", "Custom"] as const;
type Preset = (typeof PRESETS)[number];

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function Page() {
  const run = useServerFn(getAdminStats);
  const [preset, setPreset] = useState<Preset>("Last 30 days");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const range = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (preset === "Last 7 days") return { from: daysAgo(6), to: today };
    if (preset === "Last 30 days") return { from: daysAgo(29), to: today };
    if (preset === "Last 90 days") return { from: daysAgo(89), to: today };
    if (preset === "This year") return { from: `${today.slice(0, 4)}-01-01`, to: today };
    return { from: from || daysAgo(29), to: to || today };
  }, [preset, from, to]);

  const query = useQuery({
    queryKey: ["admin-analytics", range.from, range.to],
    queryFn: () => run({ data: { from: range.from, to: range.to } }),
  });

  if (query.isLoading) return <LoadingState label="Loading analytics…" />;
  if (query.isError || !query.data)
    return <ErrorState message={(query.error as Error)?.message} onRetry={() => void query.refetch()} />;

  const s = query.data;
  const series = s.range.series;
  const peak = Math.max(1, ...series.map((d) => d.revenue));
  const productPeak = Math.max(1, ...s.range.productRevenue.map((p) => p.revenue));
  const growthPeak = Math.max(1, ...s.customerGrowth.map((c) => c.count));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-2 text-muted-foreground">Every figure below comes straight from your live orders and customers.</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => setPreset(p)}>
            {p}
          </Button>
        ))}
        {preset === "Custom" && (
          <>
            <Input type="date" className="w-full sm:w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="date" className="w-full sm:w-auto" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue", value: money(s.range.revenue) },
          { label: "Orders", value: String(s.range.orders) },
          { label: "Average order", value: money(s.range.avgOrderValue) },
          { label: "Payments verified", value: String(s.range.paymentsVerified) },
          { label: "Payments failed", value: String(s.range.paymentsFailed) },
          { label: "Completed", value: String(s.range.completed) },
          { label: "Cancelled", value: String(s.range.cancelled) },
          { label: "Refunded", value: String(s.range.refunded) },
        ].map((c) => (
          <div key={c.label} className="surface-panel p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="surface-panel mt-8 p-5">
        <h2 className="font-display text-lg font-semibold">Revenue over time</h2>
        {series.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No verified revenue in this period.</p>
        ) : (
          <div className="mt-4 flex h-40 items-end gap-1">
            {series.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${money(d.revenue)}`}
                className="flex-1 rounded-t bg-primary/60"
                style={{ height: `${Math.max(2, (d.revenue / peak) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="surface-panel p-5">
          <h2 className="font-display text-lg font-semibold">Revenue by product</h2>
          {s.range.productRevenue.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No paid items in this period.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {s.range.productRevenue.slice(0, 10).map((p) => (
                <li key={p.name}>
                  <div className="flex justify-between gap-3">
                    <span className="line-clamp-1">{p.name}</span>
                    <span className="font-semibold">{money(p.revenue)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(p.revenue / productPeak) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel p-5">
          <h2 className="font-display text-lg font-semibold">Orders by status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {s.range.statusBreakdown.map((b) => (
              <li key={b.status} className="flex justify-between gap-3">
                <span className="capitalize">{b.status}</span>
                <span className="font-semibold">{b.count}</span>
              </li>
            ))}
            {s.range.statusBreakdown.length === 0 && <li className="text-muted-foreground">No orders in this period.</li>}
          </ul>
        </section>

        <section className="surface-panel p-5">
          <h2 className="font-display text-lg font-semibold">Customer growth</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {s.customerGrowth.map((c) => (
              <li key={c.month}>
                <div className="flex justify-between gap-3">
                  <span>{c.month}</span>
                  <span className="font-semibold">{c.count} new</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(c.count / growthPeak) * 100}%` }} />
                </div>
              </li>
            ))}
            {s.customerGrowth.length === 0 && <li className="text-muted-foreground">No customers yet.</li>}
          </ul>
        </section>

        <section className="surface-panel p-5">
          <h2 className="font-display text-lg font-semibold">Best & slowest sellers</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 text-sm">
            <ul className="space-y-2">
              {s.topProducts.map((p) => (
                <li key={p.name} className="flex justify-between gap-3">
                  <span className="line-clamp-1">{p.name}</span>
                  <span className="font-semibold">{p.sold}</span>
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {s.lowestProducts.map((p) => (
                <li key={p.name} className="flex justify-between gap-3 text-muted-foreground">
                  <span className="line-clamp-1">{p.name}</span>
                  <span className="font-semibold">{p.sold}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
