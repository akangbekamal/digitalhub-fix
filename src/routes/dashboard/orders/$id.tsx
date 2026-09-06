import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Copy, Loader2, Smartphone, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { myOrderQuery } from "@/lib/account";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, dateTime, money } from "@/lib/format";
import { requestRefund, submitPaymentProof } from "@/lib/store.functions";
import { getProofUrl } from "@/lib/downloads.functions";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementSlot } from "@/components/announcements/AnnouncementNotice";

export const Route = createFileRoute("/dashboard/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order Details — DIGITAL HUB GH" },
      { name: "description", content: "View your order, submit your Mobile Money payment and track delivery." },
      { property: "og:title", content: "Order Details — DIGITAL HUB GH" },
      { property: "og:description", content: "View your order, submit your Mobile Money payment and track delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ["image/png", "image/jpeg", "image/webp"];

function Page() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { payment: momo } = useSettings();
  const qc = useQueryClient();
  const query = useQuery(myOrderQuery(id));
  const runProof = useServerFn(submitPaymentProof);
  const runRefund = useServerFn(requestRefund);
  const runProofUrl = useServerFn(getProofUrl);

  const [reference, setReference] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);

  if (query.isLoading) {
    return <LoadingState label="Loading order…" />;
  }
  if (query.isError || !query.data?.order) {
    return <ErrorState message="We could not find that order." onRetry={() => void query.refetch()} />;
  }

  const { order, items, payment, history, refund } = query.data;
  const canPay = order.payment_status === "pending" || order.payment_status === "failed";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let proofPath: string | null = null;
      if (file) {
        if (!PROOF_TYPES.includes(file.type)) throw new Error("Upload a PNG, JPG or WEBP screenshot.");
        if (file.size > MAX_PROOF_BYTES) throw new Error("Screenshot must be smaller than 5MB.");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
        const path = `${user.id}/${order.id}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("payment-proofs").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        proofPath = path;
      }
      await runProof({
        data: {
          orderId: order.id,
          reference: reference.trim(),
          senderNumber: senderNumber.trim(),
          proofPath,
        },
      });
      toast.success("Payment submitted", { description: "We are verifying it now — you will be notified." });
      setReference("");
      setSenderNumber("");
      setFile(null);
      await qc.invalidateQueries({ queryKey: ["my-order", id] });
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const askRefund = async () => {
    setRefundBusy(true);
    try {
      await runRefund({ data: { orderId: order.id, reason: reason.trim() } });
      toast.success("Refund request sent");
      setReason("");
      await qc.invalidateQueries({ queryKey: ["my-order", id] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRefundBusy(false);
    }
  };

  const viewProof = async () => {
    if (!payment) return;
    try {
      const res = await runProofUrl({ data: { paymentId: payment.id } });
      if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
      else toast.info("No screenshot was attached to this payment.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <Link
        to="/dashboard/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to orders
      </Link>

      <AnnouncementSlot placement="order" className="mt-4" />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">Placed {dateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status] ?? order.status} />
          <StatusBadge
            status={order.payment_status}
            label={`Payment: ${PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}`}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="surface-panel p-5">
            <h2 className="font-display text-lg font-semibold">Items</h2>
            <ul className="mt-3 divide-y divide-border text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {i.quantity} × {i.product_name}
                  </span>
                  <span className="font-medium">{money(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(order.subtotal)}</dd>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-success">
                  <dt>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</dt>
                  <dd>−{money(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-display text-base font-semibold">
                <dt>Total</dt>
                <dd className="text-primary">{money(order.total)}</dd>
              </div>
            </dl>
            {order.customer_note && (
              <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Your note: </span>
                {order.customer_note}
              </p>
            )}
          </section>

          {canPay ? (
            <section className="surface-panel p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Smartphone className="size-5 text-primary" aria-hidden /> Pay with Mobile Money
              </h2>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  Send exactly <span className="font-semibold text-primary">{money(order.total)}</span> to{" "}
                  <span className="font-semibold text-foreground">{momo?.momo_number || "—"}</span> (
                  {momo?.momo_name || "DIGITAL HUB GH"}).
                </li>
                <li>Copy the transaction ID from your Mobile Money confirmation SMS.</li>
                <li>Submit it below — we verify and deliver, usually within minutes.</li>
              </ol>
              {momo?.momo_number && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    void navigator.clipboard.writeText(momo.momo_number ?? "");
                    toast.success("MoMo number copied");
                  }}
                >
                  <Copy className="mr-2 size-4" aria-hidden /> Copy MoMo number
                </Button>
              )}

              <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reference">Transaction ID</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    minLength={3}
                    maxLength={80}
                    placeholder="e.g. 1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="sender">Number you paid from</Label>
                  <Input
                    id="sender"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    required
                    minLength={7}
                    maxLength={30}
                    placeholder="024 000 0000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="proof">Payment screenshot (optional)</Label>
                  <Input
                    id="proof"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or WEBP up to 5MB.</p>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                    {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                    Submit payment for verification
                  </Button>
                </div>
              </form>
            </section>
          ) : (
            <section className="surface-panel p-5">
              <h2 className="font-display text-lg font-semibold">Payment</h2>
              {payment ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <StatusBadge status={payment.status} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Transaction ID</dt>
                    <dd className="font-medium">{payment.reference ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Paid from</dt>
                    <dd className="font-medium">{payment.sender_number ?? "—"}</dd>
                  </div>
                  {payment.admin_note && (
                    <p className="rounded-lg bg-muted p-3 text-muted-foreground">{payment.admin_note}</p>
                  )}
                  {payment.proof_path && (
                    <Button type="button" size="sm" variant="outline" onClick={() => void viewProof()}>
                      View my screenshot
                    </Button>
                  )}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No payment recorded yet.</p>
              )}
              {order.payment_status === "verified" && (
                <Button asChild size="sm" className="mt-4">
                  <Link to="/dashboard/downloads">Go to my downloads</Link>
                </Button>
              )}
            </section>
          )}

          {order.payment_status === "verified" && (
            <section className="surface-panel p-5">
              <h2 className="font-display text-lg font-semibold">Need a refund?</h2>
              {refund ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Refund request <StatusBadge status={refund.status} className="mx-1" /> for {money(refund.amount)}.
                  {refund.admin_note ? ` ${refund.admin_note}` : ""}
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us what went wrong (at least 10 characters)"
                    maxLength={1000}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={refundBusy || reason.trim().length < 10}
                    onClick={() => void askRefund()}
                  >
                    {refundBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Request refund
                  </Button>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="surface-panel h-fit p-5">
          <h2 className="font-display text-lg font-semibold">Timeline</h2>
          <ol className="mt-4 space-y-4">
            {history.map((h) => (
              <li key={h.id} className="relative border-l border-border pl-4">
                <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary" />
                <p className="text-sm font-medium">{ORDER_STATUS_LABELS[h.status] ?? h.status}</p>
                {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                <p className="text-xs text-muted-foreground">{dateTime(h.created_at)}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
