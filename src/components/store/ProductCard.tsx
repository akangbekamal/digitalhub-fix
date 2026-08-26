import { Link } from "@tanstack/react-router";
import { Star, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useImageUrl } from "@/hooks/useImageUrl";
import { effectivePrice, money } from "@/lib/format";
import type { Product } from "@/lib/catalog";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const image = useImageUrl(product.image_url);
  const { add } = useCart();
  const price = effectivePrice(product);
  const hasDiscount = price < Number(product.price);
  const soldOut = !product.unlimited_stock && product.stock <= 0;

  return (
    <article className="surface-panel group flex flex-col overflow-hidden">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-muted to-background">
            <Sparkles className="size-8 text-primary/50" aria-hidden />
          </div>
        )}
        {product.is_featured && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
            Featured
          </span>
        )}
        {hasDiscount && (
          <span className="absolute right-3 top-3 rounded-full bg-success/90 px-2.5 py-1 text-[11px] font-bold text-background">
            Save {money(Number(product.price) - price)}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to="/product/$slug" params={{ slug: product.slug }}>
          <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-warning">
            <Star className="size-3.5 fill-current" aria-hidden />
            {Number(product.rating_avg).toFixed(1)}
          </span>
          <span>({product.rating_count})</span>
          <span aria-hidden>•</span>
          <span>{product.sold_count} sold</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="font-display text-lg font-bold text-primary">{money(price)}</p>
            {hasDiscount && (
              <p className="text-xs text-muted-foreground line-through">{money(product.price)}</p>
            )}
          </div>
          <Button
            size="sm"
            disabled={soldOut}
            onClick={() => {
              add({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price,
                imageUrl: product.image_url,
              });
              toast.success("Added to cart", { description: product.name });
            }}
          >
            <ShoppingCart className="mr-1.5 size-4" aria-hidden />
            {soldOut ? "Sold out" : "Add"}
          </Button>
        </div>
      </div>
    </article>
  );
}
