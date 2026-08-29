import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateBlocks";
import { getActivityLog } from "@/lib/messages.functions";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — DIGITAL HUB GH" },
      { name: "description", content: "Audit trail of every admin action taken in DIGITAL HUB GH." },
      { property: "og:title", content: "Activity Log — DIGITAL HUB GH" },
      { property: "og:description", content: "Audit trail of every admin action taken in DIGITAL HUB GH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const run = useServerFn(getActivityLog);
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["admin-activity", search], queryFn: () => run({ data: { search } }) });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Activity Log</h1>
      <p className="mt-2 text-muted-foreground">Who did what, and when — recorded automatically.</p>

      <Input
        className="mt-6 max-w-xs"
        placeholder="Search action, admin or details…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-4">
        {query.isLoading ? (
          <LoadingState label="Loading activity…" />
        ) : query.isError ? (
          <ErrorState message={(query.error as Error).message} onRetry={() => void query.refetch()} />
        ) : (query.data ?? []).length === 0 ? (
          <EmptyState title="No activity recorded yet" description="Admin actions will appear here as they happen." />
        ) : (
          <div className="surface-panel overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Date</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {(query.data ?? []).map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-3 whitespace-nowrap">{dateTime(r.created_at)}</td>
                    <td>{r.actor}</td>
                    <td className="capitalize">{r.action.replace(/_/g, " ")}</td>
                    <td className="text-muted-foreground">{r.target_type ?? "—"}</td>
                    <td className="max-w-[280px] text-muted-foreground">{r.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
