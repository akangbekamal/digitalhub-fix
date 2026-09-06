import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Info, Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  dismissAnnouncement,
  popupAlreadyShown,
  rememberPopupShown,
  trackAnnouncement,
  typeMeta,
  useAnnouncements,
  type Announcement,
  type AnnouncementContext,
  type Placement,
} from "@/lib/announcements";

/** Priority drives the visual weight — never the announcement type. */
function toneClasses(priority: string) {
  if (priority === "urgent") return "border-destructive/40 bg-destructive/10 text-foreground";
  if (priority === "important") return "border-primary/40 bg-primary/10 text-foreground";
  return "border-border bg-muted/50 text-foreground";
}

function ToneIcon({ priority }: { priority: string }) {
  const Icon = priority === "urgent" ? AlertTriangle : priority === "important" ? Megaphone : Info;
  return (
    <Icon
      className={cn("mt-0.5 size-4 shrink-0", priority === "urgent" ? "text-destructive" : "text-primary")}
      aria-hidden
    />
  );
}

function Cta({ a }: { a: Announcement }) {
  if (!a.cta_text || !a.cta_url) return null;
  const external = /^https?:\/\//i.test(a.cta_url);
  const onClick = () => trackAnnouncement(a.id, "cta");
  return external ? (
    <Button asChild size="sm" variant="outline" onClick={onClick} className="shrink-0">
      <a href={a.cta_url} target="_blank" rel="noreferrer">
        {a.cta_text}
      </a>
    </Button>
  ) : (
    <Button asChild size="sm" variant="outline" onClick={onClick} className="shrink-0">
      <Link to={a.cta_url as never}>{a.cta_text}</Link>
    </Button>
  );
}

export function AnnouncementCard({
  announcement: a,
  onDismiss,
  compact,
}: {
  announcement: Announcement;
  onDismiss: (id: string) => void;
  compact?: boolean;
}) {
  useEffect(() => {
    trackAnnouncement(a.id, "view");
  }, [a.id]);

  return (
    <div className={cn("rounded-xl border p-3 sm:p-4", toneClasses(a.priority_level), compact && "p-3")}>
      <div className="flex items-start gap-3">
        <ToneIcon priority={a.priority_level} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            <span className="mr-1" aria-hidden>
              {typeMeta(a.type).emoji}
            </span>
            {a.title}
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground">{a.message}</p>
          {(a.cta_text || a.dismissible) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Cta a={a} />
              {a.dismissible && (
                <Button size="sm" variant="ghost" onClick={() => onDismiss(a.id)}>
                  Got it
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the announcements that belong to one placement, filtered by the
 * customer's context (product / category / provider) and their dismissals.
 */
export function AnnouncementSlot({
  placement,
  context = {},
  className,
  limit = 3,
}: {
  placement: Placement;
  context?: AnnouncementContext;
  className?: string;
  limit?: number;
}) {
  const { user } = useAuth();
  const items = useAnnouncements(placement, context);
  const [hidden, setHidden] = useState<string[]>([]);

  const visible = items.filter((a) => !hidden.includes(a.id)).slice(0, limit);
  if (visible.length === 0) return null;

  const dismiss = async (id: string) => {
    setHidden((h) => [...h, id]);
    await dismissAnnouncement(id, user?.id);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {visible.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} onDismiss={dismiss} />
      ))}
    </div>
  );
}

/** Sitewide top banner. */
export function AnnouncementTopBanner() {
  const { user } = useAuth();
  const items = useAnnouncements("banner");
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = items.filter((a) => !hidden.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="border-b border-border">
      {visible.map((a) => (
        <div
          key={a.id}
          className={cn(
            "border-b border-border/40 last:border-b-0",
            a.priority_level === "urgent" ? "bg-destructive/10" : a.priority_level === "important" ? "bg-primary/10" : "bg-muted/50",
          )}
        >
          <div className="container-page flex flex-wrap items-start gap-3 px-4 py-3 text-sm sm:flex-nowrap sm:items-center">
            <ToneIcon priority={a.priority_level} />
            <p className="min-w-0 flex-1 break-words">
              <span className="font-semibold text-foreground">{a.title}</span>{" "}
              <span className="text-muted-foreground">{a.message}</span>
            </p>
            <Cta a={a} />
            {a.dismissible && (
              <button
                type="button"
                aria-label="Dismiss announcement"
                onClick={async () => {
                  setHidden((h) => [...h, a.id]);
                  await dismissAnnouncement(a.id, user?.id);
                }}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Popup / modal placement, respecting the configured frequency. */
export function AnnouncementPopup() {
  const { user } = useAuth();
  const items = useAnnouncements("popup");
  const [current, setCurrent] = useState<Announcement | null>(null);

  useEffect(() => {
    if (current) return;
    const next = items.find((a) => !popupAlreadyShown(a.id, a.popup_frequency));
    if (next) {
      rememberPopupShown(next.id);
      trackAnnouncement(next.id, "view");
      setCurrent(next);
    }
  }, [items, current]);

  if (!current) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) setCurrent(null);
      }}
    >
      <DialogContent className="max-w-md p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ToneIcon priority={current.priority_level} />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">
              <span className="mr-1" aria-hidden>
                {typeMeta(current.type).emoji}
              </span>
              {current.title}
            </h2>
            <p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">{current.message}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Cta a={current} />
          <Button
            size="sm"
            onClick={async () => {
              if (current.dismissible) await dismissAnnouncement(current.id, user?.id);
              setCurrent(null);
            }}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
