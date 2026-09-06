import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Loader2, ShieldCheck, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/StateBlocks";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { money } from "@/lib/format";
import { placeOrder, validateCoupon } from "@/lib/store.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnnouncementSlot } from "@/components/announcements/AnnouncementNotice";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — DIGITAL HUB GH" },
      { name: "description", content: "Complete your order and pay securely with Mobile Money." },
      { property: "og:title", content: "Checkout — DIGITAL HUB GH" },
      { property: "og:description", content: "Complete your order and pay securely with Mobile Money." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { lines, subtotal, clear } = useCart();
  const { user, profile, loading } = useAuth();
  const { payment } = useSettings();
  const navigate = useNavigate();
  const runCoupon = useServerFn(validateCoupon);
  const runOrder = useServerFn(placeOrder);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const requireProof = payment?.require_proof === true;

  useEffect(() => {
    if (!proofFile) {
      setProofPreview(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const pickProof = (file: File | null) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please choose a JPG, JPEG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      toast.error("That image is larger than 5 MB. Please choose a smaller one.");
      return;
    }
    setProofFile(file);
  };

  const clearProof = () => {
    setProofFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };


  useEffect(() => {
    if (profile) {
      setFullName((v) => v || profile.full_name || "");
      setEmail((v) => v || profile.email || "");
      setPhone((v) => v || profile.phone || "");
    }
  }, [profile]);

  const items = lines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
  const total = Math.max(0, subtotal - discount);

  if (!loading && !user) {
    return (
      <main className="container-page py-16">
        <EmptyState
          title="Sign in to check out"
          description="You need an account so we can deliver your products and track your orders."
          action={
            <Button asChild>
              <Link to="/auth" search={{ redirect: "/checkout" }}>
                Sign in or create account
              </Link>
            </Button>
          }
        />
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="container-page py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add a product before checking out."
          action={
            <Button asChild>
              <Link to="/shop">Browse products</Link>
            </Button>
          }
        />
      </main>
    );
  }

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await runCoupon({ data: { items, couponCode: code.trim() } });
      setDiscount(res.discount);
      setAppliedCode(res.code);
      toast.success(`Coupon applied — you save ${money(res.discount)}`);
    } catch (e) {
      setDiscount(0);
      setAppliedCode(null);
      toast.error((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireProof && !proofFile) {
      toast.error("Please upload your payment screenshot before placing the order.");
      return;
    }
    setSubmitting(true);
    try {
      let proofPath: string | null = null;
      if (proofFile && user) {
        const ext = (proofFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;
        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(path, proofFile, { contentType: proofFile.type, upsert: false });
        if (uploadError) throw new Error(`Could not upload your screenshot: ${uploadError.message}`);
        proofPath = path;
      }

      const res = await runOrder({
        data: {
          items,
          couponCode: appliedCode,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          note: note.trim() || null,
          proofPath,
        },
      });
      clear();
      clearProof();
      toast.success(`Order ${res.orderNumber} placed`, {
        description: proofPath
          ? "We are verifying your payment screenshot."
          : "Now send your Mobile Money payment.",
      });
      void navigate({ to: "/dashboard/orders" });

    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container-page py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Checkout</h1>
      <p className="mt-2 text-muted-foreground">Confirm your details, then pay with Mobile Money.</p>

      <AnnouncementSlot placement="checkout" className="mt-6" />

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="surface-panel p-5">
            <h2 className="font-display text-lg font-semibold">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
              </div>
              <div>
                <Label htmlFor="phone">Phone (MoMo number)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="024 000 0000" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="note">Order note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Player ID, phone number to top up, or any instructions"
                  maxLength={500}
                />
              </div>
            </div>
          </section>

          <section className="surface-panel p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Smartphone className="size-5 text-primary" aria-hidden />{" "}
              {payment?.method_name || "Mobile Money payment"}
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
               <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                <dt className="text-muted-foreground">Payment method</dt>
                 <dd className="min-w-0 break-words text-right font-semibold">{payment?.method_name || "Mobile Money"}</dd>
              </div>
               <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                <dt className="text-muted-foreground">Account holder</dt>
                 <dd className="min-w-0 break-words text-right font-semibold">
                  {payment?.account_name || payment?.momo_name || "DIGITAL HUB GH"}
                </dd>
              </div>
               <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                <dt className="text-muted-foreground">Payment number</dt>
                 <dd className="min-w-0 break-all text-right font-semibold text-primary">{payment?.momo_number || "—"}</dd>
              </div>
              {(payment?.momo_networks ?? []).length > 0 && (
                 <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                  <dt className="text-muted-foreground">Networks</dt>
                   <dd className="min-w-0 break-words text-right font-medium">{(payment?.momo_networks ?? []).join(", ")}</dd>
                </div>
              )}
            </dl>
            <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
              {payment?.instructions ||
                "Place the order, send the exact total to the number above, then submit your transaction ID from your orders page. We verify and deliver within minutes."}
            </p>
            {payment?.reference_instructions && (
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                {payment.reference_instructions}
              </p>
            )}
          </section>

          <section className="surface-panel p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <ImageUp className="size-5 text-primary" aria-hidden /> Upload payment screenshot
              {requireProof && <span className="text-sm font-normal text-destructive">(required)</span>}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              After you pay, attach a photo or screenshot of the payment confirmation. JPG, PNG or WEBP, up to 5 MB.
            </p>

            <input
              ref={fileInputRef}
              id="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => pickProof(e.target.files?.[0] ?? null)}
            />

            {proofPreview ? (
              <div className="mt-4 flex flex-wrap items-start gap-4">
                <img
                  src={proofPreview}
                  alt="Payment screenshot preview"
                  className="max-h-56 rounded-xl border border-border object-contain"
                />
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">{proofFile?.name}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Choose a different image
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearProof}>
                    <X className="mr-2 size-4" aria-hidden /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full sm:w-auto"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageUp className="mr-2 size-4" aria-hidden /> Choose image
              </Button>
            )}
          </section>

        </div>

        <aside className="surface-panel h-fit p-5">
          <h2 className="font-display text-lg font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.productId} className="flex justify-between gap-3">
                <span className="line-clamp-1 text-muted-foreground">
                  {l.quantity} × {l.name}
                </span>
                <span className="font-medium">{money(l.price * l.quantity)}</span>
              </li>
            ))}
          </ul>

           <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              aria-label="Coupon code"
            />
            <Button type="button" variant="outline" onClick={() => void applyCoupon()} disabled={checking}>
              {checking ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
            </Button>
          </div>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>Discount {appliedCode ? `(${appliedCode})` : ""}</dt>
                <dd>−{money(discount)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="font-display font-semibold">Total</span>
            <span className="font-display text-xl font-bold text-primary">{money(total)}</span>
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={submitting || (requireProof && !proofFile)}
          >

            {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Place order
          </Button>
          <p className="mt-3 flex items-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
            Prices are re-checked on our server before the order is created.
          </p>
        </aside>
      </form>
    </main>
  );
}
