import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/store/ProductCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { categoriesQuery, productsQuery } from "@/lib/catalog";
import { effectivePrice } from "@/lib/format";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop Digital Products — DIGITAL HUB GH" },
      { name: "description", content: "Browse data bundles, gift cards, streaming and software with Mobile Money checkout." },
      { property: "og:title", content: "Shop Digital Products — DIGITAL HUB GH" },
      { property: "og:description", content: "Browse data bundles, gift cards, streaming and software with Mobile Money checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: z.object({ q: z.string().optional(), category: z.string().optional() }),
  component: Page,
});

type Sort = "popular" | "price-asc" | "price-desc" | "rating";

function Page() {
  const { q, category } = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const products = useQuery(productsQuery);
  const categories = useQuery(categoriesQuery);
  const [term, setTerm] = useState(q ?? "");
  const [sort, setSort] = useState<Sort>("popular");

  const list = useMemo(() => {
    let items = products.data ?? [];
    const cat = (categories.data ?? []).find((c) => c.slug === category);
    if (category && cat) items = items.filter((p) => p.category_id === cat.id);
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle) ||
          p.tags?.some((t) => t.toLowerCase().includes(needle)),
      );
    }
    const sorted = [...items];
    if (sort === "price-asc") sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === "price-desc") sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    if (sort === "rating") sorted.sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg));
    return sorted;
  }, [products.data, categories.data, category, q, sort]);

  const setCategory = (slug: string) =>
    void navigate({ search: { q, category: slug === "all" ? undefined : slug } });

  return (
    <main className="container-page py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Shop</h1>
      <p className="mt-2 text-muted-foreground">Every digital product available right now, paid with Mobile Money.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ search: { category, q: term.trim() || undefined } });
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="pl-9"
          />
        </form>
        <Select value={category ?? "all"} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-52" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="sm:w-44" aria-label="Sort products">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most popular</SelectItem>
            <SelectItem value="price-asc">Price: low to high</SelectItem>
            <SelectItem value="price-desc">Price: high to low</SelectItem>
            <SelectItem value="rating">Top rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8">
        {products.isLoading ? (
          <LoadingState label="Loading products…" rows={4} />
        ) : products.error ? (
          <ErrorState message={(products.error as Error).message} onRetry={() => void products.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try a different search term or category."
            action={
              <Button variant="outline" onClick={() => void navigate({ search: {} })}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
