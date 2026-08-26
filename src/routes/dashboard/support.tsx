import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, MessageSquarePlus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/StateBlocks";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { myTicketsQuery, ticketMessagesQuery } from "@/lib/account";
import { dateTime } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/support")({
  head: () => ({
    meta: [
      { title: "Support — DIGITAL HUB GH" },
      { name: "description", content: "Open a support ticket and chat with the DIGITAL HUB GH team." },
      { property: "og:title", content: "Support — DIGITAL HUB GH" },
      { property: "og:description", content: "Open a support ticket and chat with the DIGITAL HUB GH team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const CATEGORIES = ["order", "payment", "delivery", "refund", "account", "other"];

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const tickets = useQuery(myTicketsQuery(user?.id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const messages = useQuery(ticketMessagesQuery(activeId));

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("order");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({ user_id: user.id, subject: subject.trim(), category, priority: "normal", status: "open" })
        .select("id")
        .single();
      if (error) throw error;
      const { error: msgError } = await supabase
        .from("support_messages")
        .insert({ ticket_id: ticket.id, sender_id: user.id, is_staff_reply: false, message: message.trim() });
      if (msgError) throw msgError;
      setSubject("");
      setMessage("");
      setActiveId(ticket.id);
      toast.success("Ticket created — we will reply shortly.");
      await qc.invalidateQueries({ queryKey: ["my-tickets"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!user || !activeId || !reply.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("support_messages")
        .insert({ ticket_id: activeId, sender_id: user.id, is_staff_reply: false, message: reply.trim() });
      if (error) throw error;
      setReply("");
      await qc.invalidateQueries({ queryKey: ["ticket-messages", activeId] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Support</h1>
      <p className="mt-2 text-muted-foreground">Ask about an order, payment or delivery — we usually reply fast.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <form onSubmit={createTicket} className="surface-panel space-y-3 p-4">
            <h2 className="flex items-center gap-2 font-display font-semibold">
              <MessageSquarePlus className="size-4 text-primary" aria-hidden /> New ticket
            </h2>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3} />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                minLength={5}
                maxLength={2000}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Send ticket
            </Button>
          </form>

          <div className="surface-panel p-2">
            {tickets.isLoading ? (
              <div className="p-3">
                <LoadingState rows={2} />
              </div>
            ) : (tickets.data ?? []).length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              <ul className="space-y-1">
                {(tickets.data ?? []).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        activeId === t.id ? "bg-primary/15 text-primary" : "hover:bg-muted",
                      )}
                    >
                      <span className="line-clamp-1 font-medium">{t.subject}</span>
                      <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusBadge status={t.status} /> {dateTime(t.updated_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <section className="surface-panel min-h-[320px] p-5">
          {!activeId ? (
            <EmptyState title="Select a ticket" description="Pick a conversation on the left, or open a new ticket." />
          ) : messages.isLoading ? (
            <LoadingState label="Loading conversation…" />
          ) : (
            <>
              <ul className="flex w-full flex-col gap-3 overflow-x-hidden">
                {(messages.data ?? []).map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "flex w-full",
                      m.is_staff_reply ? "justify-end" : "justify-start",
                    )}
                  >
                    <div className={cn("flex max-w-[85%] flex-col", m.is_staff_reply && "items-end")}>
                      <span className="px-1 text-xs font-medium text-muted-foreground">
                        {m.is_staff_reply ? "Support" : "You"}
                      </span>
                      <div
                        className={cn(
                          "mt-1 rounded-2xl px-4 py-3 text-sm",
                          m.is_staff_reply
                            ? "rounded-tr-sm bg-primary/10 text-foreground"
                            : "rounded-tl-sm bg-muted text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-line break-words [overflow-wrap:anywhere]">{m.message}</p>
                      </div>
                      <span className="mt-1 px-1 text-xs text-muted-foreground">{dateTime(m.created_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply…"
                  aria-label="Reply"
                />
                <Button type="button" disabled={busy || !reply.trim()} onClick={() => void sendReply()}>
                  <Send className="size-4" aria-hidden />
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
