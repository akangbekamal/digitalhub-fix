import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/StateBlocks";
import { useCart, type CartLine } from "@/hooks/useCart";
import { useImageUrl } from "@/hooks/useImageUrl";
import { money } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — DIGITAL HUB GH" },
      { name: "description", content: "Review your cart before Mobile Money checkout." },
      { property: "og:title", content: "Your Cart — DIGITAL HUB GH" },
      { property: "og:description", content: "Review your cart before Mobile Money checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Row({ line }: { line: CartLine }) {
  const image = useImageUrl(line.imageUrl);
  const { setQty, remove } = useCart();
  return (
    <div className="surface-panel grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 sm:flex sm:gap-4">
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        {image && <img src={image} alt={line.name} className="size-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <Link to="/product/$slug" params={{ slug: line.slug }} className="line-clamp-1 font-medium hover:text-primary">
          {line.name}
        </Link>
        <p className="text-sm text-muted-foreground">{money(line.price)} each</p>
      </div>
      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 sm:contents">
        <div className="flex shrink-0 items-center rounded-lg border border-border">
          <button className="min-h-10 px-3 py-1.5" aria-label="Decrease" onClick={() => setQty(line.productId, line.quantity - 1)}>
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold">{line.quantity}</span>
          <button className="min-h-10 px-3 py-1.5" aria-label="Increase" onClick={() => setQty(line.productId, line.quantity + 1)}>
            +
          </button>
        </div>
        <p className="min-w-0 text-right font-semibold sm:w-24">{money(line.price * line.quantity)}</p>
        <Button variant="ghost" size="icon" className="size-10 shrink-0 sm:size-9" aria-label={`Remove ${line.name}`} onClick={() => remove(line.productId)}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Page() {
  const { lines, subtotal, clear } = useCart();

  return (
    <main className="container-page py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Your cart</h1>

      {lines.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Your cart is empty"
            description="Browse the store and add a digital product to get started."
            icon={<ShoppingBag className="size-5" />}
            action={
              <Button asChild>
                <Link to="/shop">Start shopping</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {lines.map((l) => (
              <Row key={l.productId} line={l} />
            ))}
            <Button variant="ghost" className="text-muted-foreground" onClick={clear}>
              Clear cart
            </Button>
          </div>

          <aside className="surface-panel h-fit p-5">
            <h2 className="font-display text-lg font-semibold">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-medium text-success">Instant / digital</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="font-display font-semibold">Total</span>
              <span className="font-display text-xl font-bold text-primary">{money(subtotal)}</span>
            </div>
            <Button asChild size="lg" className="mt-5 w-full">
              <Link to="/checkout">
                Checkout <ArrowRight className="ml-2 size-4" aria-hidden />
              </Link>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">Coupon codes are applied at checkout.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
