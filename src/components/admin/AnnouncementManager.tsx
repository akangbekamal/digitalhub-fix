import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, BellRing, Copy, Eye, Megaphone, Pencil, Pin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState, EmptyState } from "@/components/StateBlocks";
import { supabase } from "@/integrations/supabase/client";
import { adminAnnouncementsQuery, adminCategoriesQuery, adminProductsQuery } from "@/lib/admin-data";
import { broadcastAnnouncement } from "@/lib/admin.functions";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_TYPES,
  AUDIENCES,
  DISPLAY_SCOPES,
  NOTIFICATION_CHANNEL_PRESETS,
  PLACEMENTS,
  POPUP_FREQUENCIES,
  PRIORITIES,
  STATUSES,
  effectiveStatus,
  label as labelOf,
  typeMeta,
} from "@/lib/announcements";

type Row = Record<string, unknown>;

const str = (r: Row, k: string, fallback = "") => (r[k] == null ? fallback : String(r[k]));
const arr = (r: Row, k: string): string[] => (Array.isArray(r[k]) ? (r[k] as string[]) : []);
const num = (r: Row, k: string) => Number(r[k] ?? 0);

type FormState = {
  id?: string;
  title: string;
  message: string;
  type: string;
  priority_level: string;
  status: string;
  display_scope: string;
  placements: string[];
  audience: string;
  target_product_ids: string[];
  target_category_ids: string[];
  target_provider_tags: string[];
  dismissible: boolean;
  pinned: boolean;
  cta_text: string;
  cta_url: string;
  popup_frequency: string;
  notification_channels: string[];
  starts_at: string;
  ends_at: string;
};

const EMPTY: FormState = {
  title: "",
  message: "",
  type: "general",
  priority_level: "normal",
  status: "draft",
  display_scope: "site",
  placements: ["banner"],
  audience: "all",
  target_product_ids: [],
  target_category_ids: [],
  target_provider_tags: [],
  dismissible: true,
  pinned: false,
  cta_text: "",
  cta_url: "",
  popup_frequency: "once",
  notification_channels: [],
  starts_at: "",
  ends_at: "",
};

function toLocalInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromRow(r: Row): FormState {
  return {
    id: str(r, "id"),
    title: str(r, "title"),
    message: str(r, "message"),
    type: str(r, "type", "general"),
    priority_level: str(r, "priority_level", "normal"),
    status: str(r, "status", "draft"),
    display_scope: str(r, "display_scope", "site"),
    placements: arr(r, "placements"),
    audience: str(r, "audience", "all"),
    target_product_ids: arr(r, "target_product_ids"),
    target_category_ids: arr(r, "target_category_ids"),
    target_provider_tags: arr(r, "target_provider_tags"),
    dismissible: r["dismissible"] !== false,
    pinned: r["pinned"] === true,
    cta_text: str(r, "cta_text"),
    cta_url: str(r, "cta_url"),
    popup_frequency: str(r, "popup_frequency", "once"),
    notification_channels: arr(r, "notification_channels"),
    starts_at: toLocalInput(str(r, "starts_at")),
    ends_at: toLocalInput(str(r, "ends_at")),
  };
}

function statusTone(status: string) {
  if (status === "published") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (status === "scheduled") return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (status === "expired" || status === "archived") return "bg-muted text-muted-foreground";
  return "bg-primary/15 text-primary";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function MultiToggle({
  values,
  selected,
  onToggle,
}: {
  values: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => {
        const on = selected.includes(v.value);
        return (
          <button
            key={v.value}
            type="button"
            onClick={() => onToggle(v.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

export function AnnouncementManager() {
  const qc = useQueryClient();
  const { user, isStaff } = useAuth();
  const list = useQuery(adminAnnouncementsQuery());
  const products = useQuery(adminProductsQuery());
  const categories = useQuery(adminCategoriesQuery());
  const runBroadcast = useServerFn(broadcastAnnouncement);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const rows = (list.data ?? []) as Row[];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const eff = effectiveStatus({
        status: str(r, "status", "draft"),
        starts_at: (r["starts_at"] as string | null) ?? null,
        ends_at: (r["ends_at"] as string | null) ?? null,
      });
      if (typeFilter !== "all" && str(r, "type", "general") !== typeFilter) return false;
      if (priorityFilter !== "all" && str(r, "priority_level", "normal") !== priorityFilter) return false;
      if (statusFilter !== "all" && eff !== statusFilter) return false;
      if (term && !`${str(r, "title")} ${str(r, "message")}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, search, typeFilter, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    let views = 0;
    let dismissals = 0;
    for (const r of rows) {
      const eff = effectiveStatus({
        status: str(r, "status", "draft"),
        starts_at: (r["starts_at"] as string | null) ?? null,
        ends_at: (r["ends_at"] as string | null) ?? null,
      });
      if (eff === "published") active += 1;
      if (eff === "scheduled") scheduled += 1;
      if (eff === "expired") expired += 1;
      views += num(r, "view_count");
      dismissals += num(r, "dismiss_count");
    }
    return { total: rows.length, active, scheduled, expired, views, dismissals };
  }, [rows]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-announcements"] });

  const patch = async (id: string, values: Row, successMessage: string) => {
    const { error } = await supabase
      .from("announcements")
      .update({ ...values, updated_by: user?.id ?? null } as never)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(successMessage);
    await refresh();
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSaving(true);
    const payload: Row = {
      title: form.title.trim(),
      message: form.message.trim(),
      type: form.type,
      priority_level: form.priority_level,
      status: form.status,
      display_scope: form.display_scope,
      placements: form.placements.length ? form.placements : ["banner"],
      audience: form.audience,
      target_product_ids: form.target_product_ids,
      target_category_ids: form.target_category_ids,
      target_provider_tags: form.target_provider_tags,
      dismissible: form.dismissible,
      pinned: form.pinned,
      cta_text: form.cta_text.trim() || null,
      cta_url: form.cta_url.trim() || null,
      popup_frequency: form.popup_frequency,
      notification_channels: form.notification_channels,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      // Legacy columns stay in sync so nothing that still reads them breaks.
      is_published: form.status === "published",
      updated_by: user?.id ?? null,
    };
    if (form.status === "published") payload["published_at"] = new Date().toISOString();

    const res = form.id
      ? await supabase.from("announcements").update(payload as never).eq("id", form.id)
      : await supabase
          .from("announcements")
          .insert({ ...payload, created_by: user?.id ?? null } as never);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(form.id ? "Announcement updated" : "Announcement created");
    setForm(null);
    await refresh();
  };

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone. Archive it instead to keep the history.`)) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Announcement deleted");
    await refresh();
  };

  const duplicate = (r: Row) => {
    const copy = fromRow(r);
    delete copy.id;
    setForm({ ...copy, title: `${copy.title} (copy)`, status: "draft" });
  };

  if (!isStaff) {
    return <EmptyState title="Staff access only" description="Only administrators can manage announcements." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Scheduled", value: stats.scheduled },
          { label: "Expired", value: stats.expired },
          { label: "Views", value: stats.views },
          { label: "Dismissals", value: stats.dismissals },
        ].map((s) => (
          <div key={s.label} className="surface-panel p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="surface-panel grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements"
            className="pl-9"
            aria-label="Search announcements"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          options={[{ value: "all", label: "All types" }, ...ANNOUNCEMENT_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All statuses" },
            ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
            { value: "expired", label: "Expired" },
          ]}
        />
        <Select
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[{ value: "all", label: "All priorities" }, ...PRIORITIES.map((p) => ({ value: p.value, label: p.label }))]}
        />
      </div>

      <Button onClick={() => setForm({ ...EMPTY })} className="w-full sm:w-fit">
        <Plus className="mr-2 size-4" aria-hidden /> New announcement
      </Button>

      {list.isLoading ? (
        <LoadingState rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No announcements match" description="Try a different search or filter." />
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const id = str(r, "id");
            const eff = effectiveStatus({
              status: str(r, "status", "draft"),
              starts_at: (r["starts_at"] as string | null) ?? null,
              ends_at: (r["ends_at"] as string | null) ?? null,
            });
            const meta = typeMeta(str(r, "type", "general"));
            return (
              <li key={id} className="surface-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusTone(eff))}>{eff}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {str(r, "priority_level", "normal")}
                      </span>
                      {r["pinned"] === true && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Pinned</span>
                      )}
                    </div>
                    <p className="mt-2 font-medium">{str(r, "title")}</p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{str(r, "message")}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {labelOf(AUDIENCES, str(r, "audience", "all"))} ·{" "}
                      {arr(r, "placements")
                        .map((p) => labelOf(PLACEMENTS, p))
                        .join(", ") || "No placement"}{" "}
                      · created {dateTime(str(r, "created_at"))}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3" aria-hidden /> {num(r, "view_count")} views
                      </span>
                      <span>{num(r, "dismiss_count")} dismissed</span>
                      <span>{num(r, "cta_click_count")} button clicks</span>
                      <span>{num(r, "notified_count")} notified</span>
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Button size="sm" variant="outline" onClick={() => setForm(fromRow(r))}>
                      <Pencil className="mr-1.5 size-3.5" aria-hidden /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patch(
                          id,
                          eff === "published"
                            ? { status: "draft", is_published: false }
                            : { status: "published", is_published: true, published_at: new Date().toISOString(), published_by: user?.id ?? null },
                          eff === "published" ? "Unpublished" : "Published",
                        )
                      }
                    >
                      {eff === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patch(id, { pinned: r["pinned"] !== true }, r["pinned"] === true ? "Unpinned" : "Pinned")}
                    >
                      <Pin className="mr-1.5 size-3.5" aria-hidden /> {r["pinned"] === true ? "Unpin" : "Pin"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => duplicate(r)}>
                      <Copy className="mr-1.5 size-3.5" aria-hidden /> Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await runBroadcast({ data: { announcementId: id } });
                          toast.success(`Notified ${res.sent} customers`);
                          await refresh();
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                    >
                      <BellRing className="mr-1.5 size-3.5" aria-hidden /> Notify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patch(id, { status: "archived", is_published: false, archived_at: new Date().toISOString() }, "Archived")
                      }
                    >
                      <Archive className="mr-1.5 size-3.5" aria-hidden /> Archive
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(id, str(r, "title"))}>
                      <Trash2 className="mr-1.5 size-3.5" aria-hidden /> Delete
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(form)} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit announcement" : "New announcement"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <Field label="Title">
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Message">
                <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Type">
                  <Select
                    value={form.type}
                    onChange={(v) => setForm({ ...form, type: v })}
                    options={ANNOUNCEMENT_TYPES.map((t) => ({ value: t.value, label: `${t.emoji} ${t.label}` }))}
                  />
                </Field>
                <Field label="Priority">
                  <Select value={form.priority_level} onChange={(v) => setForm({ ...form, priority_level: v })} options={PRIORITIES} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES} />
                </Field>
                <Field label="Audience">
                  <Select value={form.audience} onChange={(v) => setForm({ ...form, audience: v })} options={AUDIENCES} />
                </Field>
                <Field label="Display scope">
                  <Select value={form.display_scope} onChange={(v) => setForm({ ...form, display_scope: v })} options={DISPLAY_SCOPES} />
                </Field>
                <Field label="Popup frequency">
                  <Select
                    value={form.popup_frequency}
                    onChange={(v) => setForm({ ...form, popup_frequency: v })}
                    options={POPUP_FREQUENCIES}
                  />
                </Field>
                <Field label="Starts (optional)">
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                </Field>
                <Field label="Expires (optional)">
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                </Field>
                <Field label="Button text (optional)">
                  <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
                </Field>
                <Field label="Button link (optional)">
                  <Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="/shop" />
                </Field>
              </div>

              <Field label="Where it shows">
                <MultiToggle
                  values={PLACEMENTS}
                  selected={form.placements}
                  onToggle={(v) =>
                    setForm({
                      ...form,
                      placements: form.placements.includes(v)
                        ? form.placements.filter((p) => p !== v)
                        : [...form.placements, v],
                    })
                  }
                />
              </Field>

              <Field label="Notification channels">
                <Select
                  value={
                    NOTIFICATION_CHANNEL_PRESETS.find(
                      (p) => [...p.channels].sort().join(",") === [...form.notification_channels].sort().join(","),
                    )?.value ?? "none"
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      notification_channels: [
                        ...(NOTIFICATION_CHANNEL_PRESETS.find((p) => p.value === v)?.channels ?? []),
                      ],
                    })
                  }
                  options={NOTIFICATION_CHANNEL_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
                />
              </Field>

              <Field label="Target products (optional)">
                <select
                  multiple
                  value={form.target_product_ids}
                  onChange={(e) =>
                    setForm({ ...form, target_product_ids: Array.from(e.target.selectedOptions).map((o) => o.value) })
                  }
                  className="h-28 w-full rounded-md border border-input bg-background p-2 text-sm"
                >
                  {((products.data ?? []) as Row[]).map((p) => (
                    <option key={str(p, "id")} value={str(p, "id")}>
                      {str(p, "name")}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Target categories (optional)">
                <select
                  multiple
                  value={form.target_category_ids}
                  onChange={(e) =>
                    setForm({ ...form, target_category_ids: Array.from(e.target.selectedOptions).map((o) => o.value) })
                  }
                  className="h-24 w-full rounded-md border border-input bg-background p-2 text-sm"
                >
                  {((categories.data ?? []) as Row[]).map((c) => (
                    <option key={str(c, "id")} value={str(c, "id")}>
                      {str(c, "name")}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Target networks / providers (comma separated, e.g. MTN, Telecel)">
                <Input
                  value={form.target_provider_tags.join(", ")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      target_provider_tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.dismissible} onCheckedChange={(v) => setForm({ ...form, dismissible: v })} />
                  Customers can dismiss
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
                  Pin to top
                </label>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
                <p className="mt-2 font-medium">
                  {typeMeta(form.type).emoji} {form.title || "Announcement title"}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {form.message || "Your message appears here."}
                </p>
                {form.cta_text && <p className="mt-2 text-sm font-medium text-primary">{form.cta_text} →</p>}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setForm(null)}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  <Megaphone className="mr-2 size-4" aria-hidden /> {saving ? "Saving…" : "Save announcement"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
