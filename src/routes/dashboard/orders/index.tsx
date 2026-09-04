import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { myOrdersQuery } from "@/lib/account";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, dateTime, money } from "@/lib/format";

export const Route = createFileRoute("/dashboard/orders/")({
  head: () => ({
    meta: [
      { title: "My Orders — DIGITAL HUB GH" },
      { name: "description", content: "Track every DIGITAL HUB GH order and its Mobile Money payment status." },
      { property: "og:title", content: "My Orders — DIGITAL HUB GH" },
      { property: "og:description", content: "Track every DIGITAL HUB GH order and its Mobile Money payment status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const orders = useQuery(myOrdersQuery(user?.id));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">My orders</h1>
      <p className="mt-2 text-muted-foreground">Track every order and complete its Mobile Money payment.</p>

      <div className="mt-6">
        {orders.isLoading ? (
          <LoadingState label="Loading your orders…" />
        ) : orders.isError ? (
          <ErrorState message={(orders.error as Error).message} onRetry={() => void orders.refetch()} />
        ) : (orders.data ?? []).length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Once you place an order it will appear here with its payment status."
            action={
              <Button asChild>
                <Link to="/shop">Browse products</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {(orders.data ?? []).map((o) => (
              <li key={o.id} className="surface-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-semibold">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{dateTime(o.created_at)}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {(o.order_items ?? []).map((i) => `${i.quantity} × ${i.product_name}`).join(", ")}
                    </p>
                  </div>
                  <div className="w-full items-stretch gap-2 sm:flex sm:w-auto sm:flex-col sm:items-end">
                    <span className="font-display text-lg font-bold text-primary">{money(o.total)}</span>
                    <div className="mt-2 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
                      <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status] ?? o.status} />
                      <StatusBadge
                        status={o.payment_status}
                        label={`Payment: ${PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}`}
                      />
                    </div>
                    <Button asChild size="sm" className="mt-2 w-full sm:mt-0 sm:w-auto" variant={o.payment_status === "pending" ? "default" : "outline"}>
                      <Link to="/dashboard/orders/$id" params={{ id: o.id }}>
                        {o.payment_status === "pending" ? "Submit payment" : "View order"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
