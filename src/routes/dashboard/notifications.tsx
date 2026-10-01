import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { BellRing, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { useAuth } from "@/hooks/useAuth";
import { myNotificationsQuery } from "@/lib/account";
import { dateTime } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AnnouncementSlot } from "@/components/announcements/AnnouncementNotice";

export const Route = createFileRoute("/dashboard/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — DIGITAL HUB GH" },
      { name: "description", content: "Order, payment and delivery updates from DIGITAL HUB GH." },
      { property: "og:title", content: "Notifications — DIGITAL HUB GH" },
      { property: "og:description", content: "Order, payment and delivery updates from DIGITAL HUB GH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery(myNotificationsQuery(user?.id));

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["my-notifications"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const rows = query.data ?? [];
  const unread = rows.filter((n) => !n.is_read);

  const markAll = async () => {
    if (!user || unread.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    await qc.invalidateQueries({ queryKey: ["my-notifications"] });
  };

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["my-notifications"] });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-2 text-muted-foreground">Payment, delivery and store updates in real time.</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => void markAll()}>
            <CheckCheck className="mr-2 size-4" aria-hidden /> Mark all read
          </Button>
        )}
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <LoadingState label="Loading notifications…" />
        ) : query.isError ? (
          <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="No notifications yet" description="We will alert you about payments and deliveries here." />
        ) : (
          <ul className="space-y-2">
            {rows.map((n) => (
              <li
                key={n.id}
                className={cn("surface-panel p-4", !n.is_read && "border-primary/40 bg-primary/5")}
                onClick={() => !n.is_read && void markOne(n.id)}
              >
                <div className="flex items-start gap-3">
                  <BellRing className={cn("mt-0.5 size-4", n.is_read ? "text-muted-foreground" : "text-primary")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{n.title}</p>
                    {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{dateTime(n.created_at)}</p>
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
