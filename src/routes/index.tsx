import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Smartphone, Clock, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/ProductCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { categoriesQuery, productsQuery } from "@/lib/catalog";
import { useSettings } from "@/hooks/useSettings";
import { AnnouncementSlot } from "@/components/announcements/AnnouncementNotice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DIGITAL HUB GH — Buy Digital Products with Mobile Money" },
      {
        name: "description",
        content:
          "Ghana's trusted digital store for data bundles, gift cards, streaming accounts and software. Pay with MTN, Telecel or AirtelTigo Mobile Money.",
      },
      { property: "og:title", content: "DIGITAL HUB GH — Buy Digital Products with Mobile Money" },
      {
        property: "og:description",
        content: "Data bundles, gift cards, streaming and software delivered fast. Mobile Money checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PERKS = [
  { icon: Smartphone, title: "Mobile Money checkout", body: "Pay with MTN, Telecel or AirtelTigo MoMo — no card needed." },
  { icon: Clock, title: "Fast delivery", body: "Most orders are verified and delivered within 30 minutes." },
  { icon: ShieldCheck, title: "Verified products", body: "Every code and account is checked before it reaches you." },
  { icon: Headphones, title: "Real support", body: "Ghana-based support team ready to help through your dashboard." },
];

function Index() {
  const products = useQuery(productsQuery);
  const categories = useQuery(categoriesQuery);
  const { homepage } = useSettings();

  const featured = (products.data ?? []).filter((p) => p.is_featured).slice(0, 4);
  const newest = (products.data ?? []).slice(0, 8);

  return (
    <main>
      <AnnouncementSlot placement="homepage" className="container-page pt-6" />
      <section className="hero-glow border-b border-border/60">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Trusted digital store in Ghana
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {homepage?.hero_title || (
                <>
                  Digital products, <span className="text-gradient-gold">delivered instantly</span>
                </>
              )}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {homepage?.hero_subtitle ||
                "Data bundles, gift cards, streaming accounts, software and more — paid for with Mobile Money and delivered to your dashboard."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/shop">
                  {homepage?.hero_cta || "Start shopping"} <ArrowRight className="ml-2 size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/categories">Browse categories</Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PERKS.map((p) => (
              <div key={p.title} className="surface-panel p-5">
                <p.icon className="size-5 text-primary" aria-hidden />
                <h2 className="mt-3 font-display text-sm font-semibold">{p.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Shop by category</h2>
          <Link to="/categories" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(categories.data ?? []).map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="surface-panel p-5 transition-colors hover:border-primary/50"
            >
              <h3 className="font-display font-semibold">{c.name}</h3>
              {c.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page pb-14">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Featured deals</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page pb-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Popular right now</h2>
          <Link to="/shop" className="text-sm font-medium text-primary hover:underline">
            Shop all
          </Link>
        </div>
        <div className="mt-6">
          {products.isLoading ? (
            <LoadingState label="Loading products…" rows={3} />
          ) : products.isError ? (
            <ErrorState
              message={`Product query failed: ${(products.error as Error).message}`}
              onRetry={() => void products.refetch()}
            />
          ) : newest.length === 0 ? (
            <EmptyState title="No products yet" description="Products added in the admin dashboard will appear here." />
          ) : (

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {newest.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
