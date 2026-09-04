import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DEFAULT_RULES,
  DEFAULT_TEMPLATES,
  MESSAGE_VARIABLES,
  TONES,
  applyTone,
  renderTemplate,
  type Tone,
} from "@/lib/messages";
import {
  getMessageCenterData,
  retryMessage,
  saveMessageTemplate,
  sendManualMessage,
  setAutomationRule,
} from "@/lib/messages.functions";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/messages")({
  head: () => ({
    meta: [
      { title: "Message Center — DIGITAL HUB GH" },
      { name: "description", content: "Email templates, automation rules and message history for DIGITAL HUB GH." },
      { property: "og:title", content: "Message Center — DIGITAL HUB GH" },
      { property: "og:description", content: "Email templates, automation rules and message history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const load = useServerFn(getMessageCenterData);
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["message-center", status, search],
    queryFn: () => load({ data: { status, search } }),
  });

  const saveTpl = useMutation({
    mutationFn: useServerFn(saveMessageTemplate),
    onSuccess: () => {
      toast.success("Template saved");
      void qc.invalidateQueries({ queryKey: ["message-center"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleRule = useMutation({
    mutationFn: useServerFn(setAutomationRule),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["message-center"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const send = useMutation({
    mutationFn: useServerFn(sendManualMessage),
    onSuccess: () => {
      toast.success("Message sent");
      void qc.invalidateQueries({ queryKey: ["message-center"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const retry = useMutation({
    mutationFn: useServerFn(retryMessage),
    onSuccess: () => {
      toast.success("Message re-sent");
      void qc.invalidateQueries({ queryKey: ["message-center"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overrides = query.data?.settings.templates ?? {};
  const rules = query.data?.settings.rules ?? {};
  const stats = query.data?.stats ?? {};

  const templates = useMemo(
    () =>
      DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        subject: overrides[t.key]?.subject ?? t.subject,
        body: overrides[t.key]?.body ?? t.body,
        customised: Boolean(overrides[t.key]),
      })),
    [overrides],
  );

  const [activeKey, setActiveKey] = useState(DEFAULT_TEMPLATES[0]!.key);
  const active = templates.find((t) => t.key === activeKey) ?? templates[0]!;
  const [draft, setDraft] = useState<{ key: string; subject: string; body: string } | null>(null);
  const editing = draft && draft.key === active.key ? draft : { key: active.key, subject: active.subject, body: active.body };

  // Generator state
  const [gen, setGen] = useState({ templateKey: DEFAULT_TEMPLATES[0]!.key, to: "", tone: "Professional" as Tone });
  const [vars, setVars] = useState<Record<string, string>>({});
  const genTemplate = templates.find((t) => t.key === gen.templateKey) ?? templates[0]!;
  const preview = {
    subject: renderTemplate(genTemplate.subject, vars),
    body: applyTone(renderTemplate(genTemplate.body, vars), gen.tone),
  };

  if (query.isLoading) return <LoadingState label="Loading Message Center…" />;
  if (query.isError) return <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />;

  const logs = query.data?.logs ?? [];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Message Center</h1>
      <p className="mt-2 text-muted-foreground">
        Email templates, automation rules and the real send history — powered by your existing email provider.
      </p>

      <Tabs defaultValue="templates" className="mt-6">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="generator">Generator</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="templates" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <ul className="surface-panel max-h-[520px] space-y-1 overflow-y-auto p-2">
              {templates.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveKey(t.key);
                      setDraft(null);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      t.key === active.key ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {t.label}
                    {t.customised && <span className="ml-2 text-xs text-muted-foreground">edited</span>}
                  </button>
                </li>
              ))}
            </ul>

            <div className="surface-panel space-y-3 p-5">
              <label className="block text-sm font-medium">
                Subject
                <Input
                  className="mt-1"
                  value={editing.subject}
                  onChange={(e) => setDraft({ key: active.key, subject: e.target.value, body: editing.body })}
                />
              </label>
              <label className="block text-sm font-medium">
                Body
                <Textarea
                  className="mt-1 min-h-56 font-mono text-xs"
                  value={editing.body}
                  onChange={(e) => setDraft({ key: active.key, subject: editing.subject, body: e.target.value })}
                />
              </label>
              <div className="flex flex-wrap gap-1">
                {MESSAGE_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      setDraft({ key: active.key, subject: editing.subject, body: `${editing.body}{{${v}}}` })
                    }
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              <Button
                disabled={saveTpl.isPending}
                onClick={() =>
                  saveTpl.mutate({ data: { key: active.key, subject: editing.subject, body: editing.body } })
                }
              >
                Save template
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="mt-4">
          <div className="surface-panel divide-y divide-border">
            {DEFAULT_RULES.map((r) => {
              const enabled = rules[r.trigger] !== false;
              const s = stats[r.templateKey] ?? stats[r.trigger];
              return (
                <div key={r.trigger} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Template: {r.templateKey} · Sent {s?.count ?? 0} time(s)
                      {s?.last ? ` · last ${dateTime(s.last)}` : ""}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleRule.mutate({ data: { trigger: r.trigger, enabled: v } })}
                  />
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="generator" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="surface-panel space-y-3 p-5">
              <label className="block text-sm font-medium">
                Template
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={gen.templateKey}
                  onChange={(e) => setGen({ ...gen, templateKey: e.target.value })}
                >
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Tone
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={gen.tone}
                  onChange={(e) => setGen({ ...gen, tone: e.target.value as Tone })}
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Recipient email
                <Input
                  className="mt-1"
                  type="email"
                  value={gen.to}
                  onChange={(e) => setGen({ ...gen, to: e.target.value })}
                  placeholder="customer@example.com"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {MESSAGE_VARIABLES.filter((v) => genTemplate.subject.includes(v) || genTemplate.body.includes(v)).map(
                  (v) => (
                    <label key={v} className="block text-xs font-medium text-muted-foreground">
                      {v}
                      <Input
                        className="mt-1"
                        value={vars[v] ?? ""}
                        onChange={(e) => setVars({ ...vars, [v]: e.target.value })}
                      />
                    </label>
                  ),
                )}
              </div>
            </div>

            <div className="surface-panel space-y-3 p-5">
              <p className="text-sm font-medium">Preview</p>
              <p className="rounded-lg bg-muted px-3 py-2 text-sm font-semibold">{preview.subject}</p>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm">
                {preview.body}
              </pre>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => void navigator.clipboard.writeText(`${preview.subject}\n\n${preview.body}`)}
                >
                  Copy
                </Button>
                <Button
                  disabled={!gen.to || send.isPending}
                  onClick={() =>
                    send.mutate({
                      data: {
                        to: gen.to,
                        subject: preview.subject,
                        body: preview.body,
                        templateKey: gen.templateKey,
                      },
                    })
                  }
                >
                  Send email
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-xs"
              placeholder="Search recipient, subject or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["all", "sent", "failed", "queued", "draft"].map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </div>

          <div className="surface-panel mt-4 overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Date</th>
                  <th>Type</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No messages yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="border-t border-border align-top">
                      <td className="p-3 whitespace-nowrap">{dateTime(l.created_at)}</td>
                      <td className="capitalize">{l.message_type.replace(/_/g, " ")}</td>
                      <td className="max-w-[180px] truncate">{l.recipient ?? "—"}</td>
                      <td className="max-w-[240px] truncate">{l.subject ?? "—"}</td>
                      <td className="capitalize">{l.source}</td>
                      <td>
                        <StatusBadge status={l.status} />
                        {l.error && <p className="mt-1 max-w-[220px] text-xs text-destructive">{l.error}</p>}
                      </td>
                      <td className="p-3 text-right">
                        {l.status === "failed" && (
                          <Button size="sm" variant="outline" onClick={() => retry.mutate({ data: { id: l.id } })}>
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
