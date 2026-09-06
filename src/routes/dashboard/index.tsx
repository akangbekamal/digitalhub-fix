import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Download, Receipt, Wallet } from "lucide-react";
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

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 text-muted-foreground">Here is what is happening with your account.</p>

      <AnnouncementSlot placement="dashboard" className="mt-6" />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="surface-panel mt-8 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Recent orders</h2>
          <Link to="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
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
          <ul className="mt-4 divide-y divide-border">
            {rows.slice(0, 5).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link
                    to="/dashboard/orders/$id"
                    params={{ id: o.id }}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {o.order_number}
                  </Link>
                  <p className="text-xs text-muted-foreground">{shortDate(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={o.payment_status} />
                  <span className="font-semibold">{money(o.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
