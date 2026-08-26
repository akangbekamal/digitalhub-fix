import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/policies/$slug")({
  head: ({ params }) => {
    const title = `${params.slug.replace(/-/g, " ")} — DIGITAL HUB GH`;
    const description = "Store policies for DIGITAL HUB GH.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  return (
    <main className="container-page py-14">
      <h1 className="font-display text-3xl font-bold capitalize tracking-tight">{slug.replace(/-/g, " ")}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">This policy page content is managed from the admin content settings.</p>
    </main>
  );
}
