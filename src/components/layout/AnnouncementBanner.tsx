import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Announcement = {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  link_label: string | null;
};

const DISMISS_KEY = "dismissed-announcements";

/**
 * Shows published announcements created in Admin → Coupons & news.
 * Reads the existing `announcements` table directly — RLS already hides
 * unpublished / expired rows from customers. No email required.
 */
export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const query = useQuery({
    queryKey: ["public-announcements"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<Announcement[]> => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, message, link_url, link_label, starts_at, ends_at, priority")
        .eq("is_published", true)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) return [];
      return (data ?? [])
        .filter((a) => (!a.starts_at || a.starts_at <= nowIso) && (!a.ends_at || a.ends_at >= nowIso))
        .map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          link_url: a.link_url,
          link_label: a.link_label,
        }));
    },
  });

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const items = (query.data ?? []).filter((a) => !dismissed.includes(a.id));
  if (items.length === 0) return null;

  return (
    <div className="border-b border-border bg-primary/10">
      {items.map((a) => (
        <div
          key={a.id}
          className="container-page flex flex-wrap items-start gap-3 px-4 py-3 text-sm sm:flex-nowrap sm:items-center"
        >
          <Megaphone className="mt-0.5 size-4 shrink-0 text-primary sm:mt-0" aria-hidden />
          <p className="min-w-0 flex-1 break-words">
            <span className="font-semibold text-foreground">{a.title}</span>{" "}
            <span className="text-muted-foreground">{a.message}</span>
            {a.link_url && (
              <>
                {" "}
                <a href={a.link_url} className="font-medium text-primary underline underline-offset-2">
                  {a.link_label || "Learn more"}
                </a>
              </>
            )}
          </p>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => dismiss(a.id)}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
