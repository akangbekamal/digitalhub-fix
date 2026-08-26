import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { StatusBadge } from "@/components/StatusBadge";
import { adminRefundsQuery, adminReviewsQuery, adminTicketsQuery } from "@/lib/admin-data";
import { dateTime, money } from "@/lib/format";
import { moderateReview, replyToTicket, updateRefund } from "@/lib/admin.functions";
import { ticketMessagesQuery } from "@/lib/account";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "Support & Reviews — DIGITAL HUB GH Admin" },
      { name: "description", content: "Answer tickets, moderate reviews and process refunds." },
      { property: "og:title", content: "Support & Reviews — DIGITAL HUB GH Admin" },
      { property: "og:description", content: "Answer tickets, moderate reviews and process refunds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const TICKET_STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"] as const;
const REFUND_STATUSES = ["requested", "approved", "processing", "completed", "rejected"] as const;

function Page() {
  const qc = useQueryClient();
  const tickets = useQuery(adminTicketsQuery());
  const reviews = useQuery(adminReviewsQuery());
  const refunds = useQuery(adminRefundsQuery());
  const runReply = useServerFn(replyToTicket);
  const runReview = useServerFn(moderateReview);
  const runRefund = useServerFn(updateRefund);
  const [activeId, setActiveId] = useState<string | null>(null);
  const messages = useQuery(ticketMessagesQuery(activeId));
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (status?: (typeof TICKET_STATUSES)[number]) => {
    if (!activeId || (!reply.trim() && !status)) return;
    setBusy(true);
    try {
      await runReply({
        data: { ticketId: activeId, message: reply.trim() || "Status updated.", ...(status ? { status } : {}) },
      });
      setReply("");
      toast.success("Reply sent");
      await qc.invalidateQueries({ queryKey: ["ticket-messages", activeId] });
      await qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Support & reviews</h1>
      <p className="mt-2 text-muted-foreground">Keep customers answered and the catalog trustworthy.</p>

      <Tabs defaultValue="tickets" className="mt-6">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="surface-panel p-2">
            {tickets.isLoading ? (
              <div className="p-3">
                <LoadingState rows={2} />
              </div>
            ) : (
              <ul className="space-y-1">
                {(tickets.data ?? []).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${activeId === t.id ? "bg-primary/15 text-primary" : "hover:bg-muted"}`}
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
          <div className="surface-panel min-h-[300px] p-5">
            {!activeId ? (
              <p className="text-sm text-muted-foreground">Select a ticket to reply.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {(messages.data ?? []).map((m) => (
                    <li
                      key={m.id}
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.is_staff_reply ? "ml-auto bg-primary/10" : "bg-muted"}`}
                    >
                      <p className="whitespace-pre-line">{m.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {m.is_staff_reply ? "Staff" : "Customer"} · {dateTime(m.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" className="max-w-md" aria-label="Reply" />
                  <Button disabled={busy} onClick={() => void send()}>
                    Send
                  </Button>
                  <Select onValueChange={(v) => void send(v as (typeof TICKET_STATUSES)[number])}>
                    <SelectTrigger className="w-48" aria-label="Set ticket status">
                      <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          {reviews.isLoading ? (
            <LoadingState />
          ) : reviews.isError ? (
            <ErrorState message={(reviews.error as Error).message} />
          ) : (
            <ul className="space-y-2">
              {(reviews.data ?? []).map((r) => (
                <li key={r.id} className="surface-panel flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.products?.name} · {r.rating}★
                    </p>
                    {r.title && <p className="text-sm font-medium">{r.title}</p>}
                    <p className="text-sm text-muted-foreground">{r.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{dateTime(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {(["approve", "reject", "remove"] as const).map((a) => (
                      <Button
                        key={a}
                        size="sm"
                        variant={a === "approve" ? "default" : "outline"}
                        onClick={async () => {
                          try {
                            await runReview({ data: { reviewId: r.id, action: a } });
                            toast.success("Review updated");
                            await qc.invalidateQueries({ queryKey: ["admin-reviews"] });
                          } catch (err) {
                            toast.error((err as Error).message);
                          }
                        }}
                        className="capitalize"
                      >
                        {a}
                      </Button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          {refunds.isLoading ? (
            <LoadingState />
          ) : (
            <ul className="space-y-2">
              {(refunds.data ?? []).map((r) => (
                <li key={r.id} className="surface-panel flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.orders?.order_number} · {money(r.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">{r.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{dateTime(r.created_at)}</p>
                  </div>
                  <Select
                    value={r.status}
                    onValueChange={async (v) => {
                      try {
                        await runRefund({ data: { refundId: r.id, status: v as (typeof REFUND_STATUSES)[number], note: null } });
                        toast.success("Refund updated");
                        await qc.invalidateQueries({ queryKey: ["admin-refunds"] });
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  >
                    <SelectTrigger className="w-44" aria-label="Refund status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REFUND_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
