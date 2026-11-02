import { useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { myNotificationsQuery } from "@/lib/account";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Staff notification list (new orders + customer support replies).
 * Reuses the existing `notifications` table and its realtime channel —
 * rows are only inserted for staff user ids, so nothing leaks to customers.
 */
export function AdminNotificationsBell({ compact = false, realtime = true }: { compact?: boolean; realtime?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const instanceId = useId();
  const [open, setOpen] = useState(false);
  const query = useQuery(myNotificationsQuery(user?.id));

  useEffect(() => {
    if (!user || !realtime) return;
    const channel = supabase
      .channel(`admin-notifications-${user.id}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { title: string; body: string | null };
          toast(row.title, { description: row.body ?? undefined });
          void qc.invalidateQueries({ queryKey: ["my-notifications"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, qc, instanceId, realtime]);

  const rows = (query.data ?? []).slice(0, 15);
  const unread = rows.filter((n) => !n.is_read).length;

  const openNotification = async (id: string, link: string | null) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["my-notifications"] });
    if (link) window.location.assign(link);
  };

  return (
    <div className={cn("relative", !compact && "mb-3")}>
      <Button
        variant="ghost"
        type="button"
        aria-label="Admin notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn("relative flex items-center gap-2 rounded-xl text-sm font-medium text-muted-foreground", compact ? "size-11 p-0" : "w-full justify-start px-3 py-2")}
      >
        <Bell className="size-4" aria-hidden />
        {!compact && "Notifications"}
        {unread > 0 && (
          <span className={cn("rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground", compact ? "absolute right-0 top-0 text-[10px]" : "ml-auto")}>
            {unread}
          </span>
        )}
      </Button>

      {open && (
        <div className={cn("absolute z-30 mt-2 max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-elevate", compact && "right-0")}>
          {rows.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="space-y-1">
              {rows.map((n) => (
                <li key={n.id}>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => void openNotification(n.id, n.link)}
                    className={cn(
                      "block h-auto w-full whitespace-normal rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-muted",
                      !n.is_read && "bg-primary/5",
                    )}
                  >
                    <span className="block font-medium">{n.title}</span>
                    {n.body && <span className="block break-words text-xs text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-xs text-muted-foreground">{dateTime(n.created_at)}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
