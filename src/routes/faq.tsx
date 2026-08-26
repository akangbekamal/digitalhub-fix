import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — DIGITAL HUB GH" },
      { name: "description", content: "Answers to common questions about orders, payments and downloads." },
      { property: "og:title", content: "FAQ — DIGITAL HUB GH" },
      { property: "og:description", content: "Answers to common questions about orders, payments and downloads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <main className="container-page py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Everything about ordering, paying and downloading.</p>
    </main>
  );
}
