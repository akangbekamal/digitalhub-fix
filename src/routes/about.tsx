import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — DIGITAL HUB GH" },
      { name: "description", content: "Learn about Ghana\u2019s trusted digital products store." },
      { property: "og:title", content: "About Us — DIGITAL HUB GH" },
      { property: "og:description", content: "Learn about Ghana\u2019s trusted digital products store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <main className="container-page py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">About DIGITAL HUB GH</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Ghana's trusted store for instant digital products.</p>
    </main>
  );
}
