import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Download, Receipt, Wallet, Clock, CheckCircle2, ShoppingBag, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingState } from "@/components/StateBlocks";
import { useAuth } from "@/hooks/useAuth";
import { myDownloadsQuery, myNotificationsQuery, myOrdersQuery } from "@/lib/account";
import { money, shortDate } from "@/lib/format";
import { AnnouncementSlot } from "@/components/announcements/AnnouncementNotice";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "My Dashboard — DIGITAL HUB GH" },
      { name: "description", content: "Your orders, downloads and account activity at DIGITAL HUB GH." },
      { property: "og:title", content: "My Dashboard — DIGITAL HUB GH" },
      { property: "og:description", content: "Your orders, downloads and account activity at DIGITAL HUB GH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, profile } = useAuth();
  const orders = useQuery(myOrdersQuery(user?.id));
  const downloads = useQuery(myDownloadsQuery(user?.id));
  const notifications = useQuery(myNotificationsQuery(user?.id));

  const rows = orders.data ?? [];
  const spent = rows.filter((o) => o.payment_status === "verified").reduce((s, o) => s + Number(o.total), 0);
  const unread = (notifications.data ?? []).filter((n) => !n.is_read).length;

  const stats = [
    { label: "Orders", value: String(rows.length), icon: Receipt },
    { label: "Total spent", value: money(spent), icon: Wallet },
    { label: "Downloads", value: String((downloads.data ?? []).length), icon: Download },
    { label: "Unread alerts", value: String(unread), icon: Bell },
  ];
  const mobileStats = [
    { label: "Orders", value: String(rows.length), icon: Receipt },
    { label: "Pending", value: String(rows.filter((o) => !["delivered", "completed", "cancelled", "refunded"].includes(o.status)).length), icon: Clock },
    { label: "Completed", value: String(rows.filter((o) => ["delivered", "completed"].includes(o.status)).length), icon: CheckCircle2 },
    { label: "Downloads", value: String((downloads.data ?? []).length), icon: Download },
  ];
  const quickActions = [
    { to: "/shop", label: "Shop", icon: ShoppingBag },
    { to: "/dashboard/orders", label: "My Orders", icon: Receipt },
    { to: "/dashboard/downloads", label: "Downloads", icon: Download },
    { to: "/dashboard/support", label: "Support", icon: LifeBuoy },
  ] as const;

  return (
    <div>
      <h1 className="hidden font-display text-3xl font-bold tracking-tight sm:block">
        Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 hidden text-muted-foreground sm:block">Here is what is happening with your account.</p>

      <AnnouncementSlot placement="dashboard" className="mb-3 sm:mb-0 sm:mt-6" />

      <div className="grid grid-cols-2 gap-2 sm:hidden" aria-label="Account summary">
        {mobileStats.map((s) => <div key={s.label} className="min-w-0 rounded-lg border border-border bg-card px-3 py-2.5"><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{s.label}</p><s.icon className="size-3.5 shrink-0 text-primary" aria-hidden /></div><p className="mt-1 font-display text-xl font-bold">{s.value}</p></div>)}
      </div>
      <div className="mt-6 hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="size-4 text-primary" aria-hidden />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Quick actions" className="mt-3 grid grid-cols-4 gap-1 sm:hidden">
        {quickActions.map((action) => <Button key={action.to} asChild variant="ghost" className="h-16 min-w-0 flex-col gap-1.5 px-0 text-[11px]"><Link to={action.to}><action.icon className="size-5 text-primary" /><span>{action.label}</span></Link></Button>)}
      </nav>
      <div className="mt-2 flex items-center justify-between gap-3 border-b border-border pb-3 text-xs sm:hidden">
        <span className="min-w-0 text-muted-foreground">Total spent <strong className="ml-1 text-foreground">{money(spent)}</strong></span>
        <Link to="/dashboard/notifications" className="shrink-0 text-primary">{unread} unread</Link>
      </div>
      <section className="mt-4 sm:surface-panel sm:mt-8 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold sm:text-lg">Recent orders</h2>
          <Link to="/dashboard/orders" className="inline-flex min-h-9 items-center text-xs font-medium text-primary hover:underline sm:min-h-0 sm:text-sm">
            View all
          </Link>
        </div>
        {orders.isLoading ? (
          <div className="mt-4">
            <LoadingState rows={2} />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No orders yet.{" "}
            <Link to="/shop" className="text-primary hover:underline">
              Browse the store
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-border sm:mt-4">
            {rows.slice(0, 5).map((o) => (
               <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2.5 sm:flex sm:flex-wrap sm:justify-between sm:gap-3 sm:py-3">
                 <div className="min-w-0">
                  <Link
                    to="/dashboard/orders/$id"
                    params={{ id: o.id }}
                     className="block truncate text-sm font-medium hover:text-primary hover:underline sm:text-base"
                  >
                     <span className="sm:hidden">{o.order_items?.[0]?.product_name || o.order_number}</span><span className="hidden sm:inline">{o.order_number}</span>
                  </Link>
                   <p className="truncate text-[10px] text-muted-foreground sm:text-xs"><span className="sm:hidden">{o.order_number} · </span>{shortDate(o.created_at)}</p>
                </div>
                 <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                   <StatusBadge status={o.payment_status} className="px-1.5 py-0.5 text-[10px] sm:px-2.5 sm:py-1 sm:text-xs" />
                   <span className="text-xs font-semibold sm:text-base">{money(o.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
