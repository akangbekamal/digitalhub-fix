import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, ShieldCheck, Zap, ShoppingCart, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState, ErrorState } from "@/components/StateBlocks";
import { ProductCard } from "@/components/store/ProductCard";
import { productQuery, productsQuery, reviewsQuery } from "@/lib/catalog";
import { useImageUrl } from "@/hooks/useImageUrl";
import { useCart } from "@/hooks/useCart";
import { effectivePrice, money, shortDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => {
    const pretty = params.slug.replace(/-/g, " ");
    const title = `${pretty} — DIGITAL HUB GH`;
    const description = `Buy ${pretty} instantly with Mobile Money on DIGITAL HUB GH.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Page,
  notFoundComponent: () => (
    <main className="container-page py-20">
      <EmptyState
        title="Product not found"
        description="This product may have been removed or renamed."
        action={
          <Button asChild>
            <Link to="/shop">Back to shop</Link>
          </Button>
        }
      />
    </main>
  ),
});

function Page() {
  const { slug } = Route.useParams();
  const productRes = useQuery(productQuery(slug));
  const product = productRes.data;
  const reviews = useQuery(reviewsQuery(product?.id));
  const all = useQuery(productsQuery);
  const image = useImageUrl(product?.image_url ?? null);
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  if (productRes.isLoading) {
    return (
      <main className="container-page py-14">
        <LoadingState label="Loading product…" rows={4} />
      </main>
    );
  }
  if (productRes.error) {
    return (
      <main className="container-page py-14">
        <ErrorState message={(productRes.error as Error).message} onRetry={() => void productRes.refetch()} />
      </main>
    );
  }
  if (!product) throw notFound();

  const price = effectivePrice(product);
  const hasDiscount = price < Number(product.price);
  const soldOut = !product.unlimited_stock && product.stock <= 0;
  const related = (all.data ?? []).filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 4);

  return (
    <main className="container-page py-10">
      <Link to="/shop" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="surface-panel aspect-[4/3] overflow-hidden">
          {image ? (
            <img src={image} alt={product.name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-muted to-background">
              <Sparkles className="size-12 text-primary/40" aria-hidden />
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-warning">
              <Star className="size-4 fill-current" aria-hidden />
              {Number(product.rating_avg).toFixed(1)} ({product.rating_count})
            </span>
            <span aria-hidden>•</span>
            <span>{product.sold_count} sold</span>
            <span aria-hidden>•</span>
            <span>{product.unlimited_stock ? "Always in stock" : `${product.stock} in stock`}</span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <p className="font-display text-4xl font-bold text-primary">{money(price)}</p>
            {hasDiscount && <p className="pb-1 text-muted-foreground line-through">{money(product.price)}</p>}
          </div>

          <p className="mt-5 whitespace-pre-line text-muted-foreground">{product.description}</p>

          {product.features?.length > 0 && (
            <ul className="mt-5 space-y-2">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          )}

          <div className="surface-panel mt-6 flex items-start gap-3 p-4 text-sm">
            <Zap className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="text-muted-foreground">{product.delivery_info}</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-border">
              <button
                type="button"
                aria-label="Decrease quantity"
                className="px-3 py-2 text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                className="px-3 py-2 text-lg"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
              >
                +
              </button>
            </div>
            <Button
              size="lg"
              disabled={soldOut}
              onClick={() => {
                add(
                  {
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    price,
                    imageUrl: product.image_url,
                  },
                  qty,
                );
                toast.success("Added to cart", { description: `${qty} × ${product.name}` });
              }}
            >
              <ShoppingCart className="mr-2 size-4" aria-hidden />
              {soldOut ? "Sold out" : "Add to cart"}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/cart">View cart</Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold">Customer reviews</h2>
        <div className="mt-4 space-y-3">
          {reviews.isLoading && <LoadingState label="Loading reviews…" rows={2} />}
          {!reviews.isLoading && (reviews.data ?? []).length === 0 && (
            <EmptyState title="No reviews yet" description="Be the first to review this product after purchase." />
          )}
          {(reviews.data ?? []).map((r) => (
            <div key={r.id} className="surface-panel p-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex text-warning" aria-label={`${r.rating} out of 5`}>
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" aria-hidden />
                  ))}
                </span>
                <span className="text-xs text-muted-foreground">{shortDate(r.created_at)}</span>
              </div>
              {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
              {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold">You may also like</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
