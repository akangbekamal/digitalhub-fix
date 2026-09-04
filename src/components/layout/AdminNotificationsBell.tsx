import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { myNotificationsQuery } from "@/lib/account";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Staff notification list (new orders + customer support replies).
 * Reuses the existing `notifications` table and its realtime channel —
 * rows are only inserted for staff user ids, so nothing leaks to customers.
 */
export function AdminNotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const query = useQuery(myNotificationsQuery(user?.id));

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`admin-notifications-${user.id}`)
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
  }, [user, qc]);

  const rows = (query.data ?? []).slice(0, 15);
  const unread = rows.filter((n) => !n.is_read).length;

  const openNotification = async (id: string, link: string | null) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    await qc.invalidateQueries({ queryKey: ["my-notifications"] });
    if (link) window.location.assign(link);
  };

  return (
    <div className="relative mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" aria-hidden />
        Notifications
        {unread > 0 && (
          <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-2 max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
          {rows.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="space-y-1">
              {rows.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(n.id, n.link)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                      !n.is_read && "bg-primary/5",
                    )}
                  >
                    <span className="block font-medium">{n.title}</span>
                    {n.body && <span className="block break-words text-xs text-muted-foreground">{n.body}</span>}
                    <span className="mt-1 block text-xs text-muted-foreground">{dateTime(n.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
