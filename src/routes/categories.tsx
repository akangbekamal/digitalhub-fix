import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { categoriesQuery, productsQuery } from "@/lib/catalog";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Product Categories — DIGITAL HUB GH" },
      { name: "description", content: "Explore data bundles, gift cards, streaming, accounts, software and more." },
      { property: "og:title", content: "Product Categories — DIGITAL HUB GH" },
      { property: "og:description", content: "Explore data bundles, gift cards, streaming, accounts, software and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const categories = useQuery(categoriesQuery);
  const products = useQuery(productsQuery);

  return (
    <main className="container-page py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Categories</h1>
      <p className="mt-2 text-muted-foreground">Pick a category to see everything available in it.</p>

      <div className="mt-8">
        {categories.isLoading ? (
          <LoadingState label="Loading categories…" rows={3} />
        ) : categories.isError ? (
          <ErrorState
            message={`Category query failed: ${(categories.error as Error).message}`}
            onRetry={() => void categories.refetch()}
          />
        ) : (categories.data ?? []).length === 0 ? (
          <EmptyState title="No categories yet" description="Add categories from the admin dashboard." />
        ) : (

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(categories.data ?? []).map((c) => {
              const count = (products.data ?? []).filter((p) => p.category_id === c.id).length;
              return (
                <Link
                  key={c.id}
                  to="/shop"
                  search={{ category: c.slug }}
                  className="surface-panel group flex flex-col gap-2 p-6 transition-colors hover:border-primary/50"
                >
                  <h2 className="font-display text-lg font-semibold group-hover:text-primary">{c.name}</h2>
                  {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-medium text-primary">
                    {count} product{count === 1 ? "" : "s"} <ArrowRight className="size-4" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
