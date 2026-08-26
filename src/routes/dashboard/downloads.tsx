import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { useAuth } from "@/hooks/useAuth";
import { myDownloadsQuery } from "@/lib/account";
import { dateTime } from "@/lib/format";
import { getDownloadUrl } from "@/lib/downloads.functions";

export const Route = createFileRoute("/dashboard/downloads")({
  head: () => ({
    meta: [
      { title: "My Downloads — DIGITAL HUB GH" },
      { name: "description", content: "Access the digital products you purchased from DIGITAL HUB GH." },
      { property: "og:title", content: "My Downloads — DIGITAL HUB GH" },
      { property: "og:description", content: "Access the digital products you purchased from DIGITAL HUB GH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery(myDownloadsQuery(user?.id));
  const run = useServerFn(getDownloadUrl);
  const [busyId, setBusyId] = useState<string | null>(null);

  const start = async (downloadId: string) => {
    setBusyId(downloadId);
    try {
      const res = await run({ data: { downloadId } });
      window.open(res.url, "_blank", "noopener,noreferrer");
      toast.success("Download started", { description: `${res.remaining} download(s) remaining.` });
      await qc.invalidateQueries({ queryKey: ["my-downloads"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">My downloads</h1>
      <p className="mt-2 text-muted-foreground">
        Files unlock automatically once your Mobile Money payment is verified. Links are private and expire quickly.
      </p>

      <div className="mt-6">
        {query.isLoading ? (
          <LoadingState label="Loading your downloads…" />
        ) : query.isError ? (
          <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
        ) : (query.data ?? []).length === 0 ? (
          <EmptyState
            title="Nothing to download yet"
            description="Verified purchases of downloadable products show up here."
            action={
              <Button asChild>
                <Link to="/shop">Browse products</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {(query.data ?? []).map((d) => {
              const remaining = Math.max(0, d.max_downloads - d.download_count);
              const expired = d.expires_at ? new Date(d.expires_at) < new Date() : false;
              const disabled = !d.is_active || expired || remaining === 0 || !d.file_path;
              return (
                <li key={d.id} className="surface-panel flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{d.products?.name ?? "Digital product"}</p>
                    <p className="text-xs text-muted-foreground">
                      Order {d.orders?.order_number ?? "—"} · {remaining} of {d.max_downloads} downloads left
                      {d.expires_at ? ` · expires ${dateTime(d.expires_at)}` : ""}
                    </p>
                    {!d.file_path && d.products?.delivery_info && (
                      <p className="mt-1 text-xs text-muted-foreground">{d.products.delivery_info}</p>
                    )}
                  </div>
                  <Button size="sm" disabled={disabled || busyId === d.id} onClick={() => void start(d.id)}>
                    {busyId === d.id ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 size-4" aria-hidden />
                    )}
                    {disabled ? "Unavailable" : "Download"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
