import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState, LoadingState } from "@/components/StateBlocks";
import { adminCustomersQuery } from "@/lib/admin-data";
import { shortDate } from "@/lib/format";
import { setCustomerStatus, setUserRole } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — DIGITAL HUB GH Admin" },
      { name: "description", content: "Search customers, manage access and staff roles." },
      { property: "og:title", content: "Customers — DIGITAL HUB GH Admin" },
      { property: "og:description", content: "Search customers, manage access and staff roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

const ROLES = ["customer", "support_admin", "product_admin", "order_admin", "admin", "super_admin"] as const;

const STATUSES = ["all", "active", "suspended", "deactivated"] as const;
type StatusFilter = (typeof STATUSES)[number];

function Page() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const query = useQuery(adminCustomersQuery(status, search));
  const runStatus = useServerFn(setCustomerStatus);
  const runRole = useServerFn(setUserRole);

  const rows = query.data ?? [];

  const changeStatus = async (userId: string, next: "active" | "suspended" | "deactivated") => {
    try {
      await runStatus({ data: { userId, status: next, note: null } });
      toast.success(
        next === "active" ? "Customer restored" : next === "suspended" ? "Customer suspended" : "Customer deactivated",
      );
      await qc.invalidateQueries({ queryKey: ["admin-customers"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const changeRole = async (userId: string, role: (typeof ROLES)[number]) => {
    try {
      await runRole({ data: { userId, role, grant: true } });
      toast.success("Role updated");
      await qc.invalidateQueries({ queryKey: ["admin-customers"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Customers</h1>
      <p className="mt-2 text-muted-foreground">Only super admins can change staff roles.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email or phone"
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{rows.length} customer(s)</span>
      </div>

      <div className="mt-4">
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={(query.error as Error).message} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customers match this search.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((c) => (
              <li key={c.id} className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.full_name || "Unnamed"}{" "}
                    {c.account_status !== "active" && (
                      <span className="text-xs text-destructive">({c.account_status})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.email ?? "—"} · {c.phone ?? "—"} · joined {shortDate(c.created_at)} ·{" "}
                    {c.roles.join(", ") || "customer"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isSuperAdmin && (
                    <Select value={c.roles[0] ?? "customer"} onValueChange={(v) => void changeRole(c.id, v as (typeof ROLES)[number])}>
                      <SelectTrigger className="w-44" aria-label={`Role for ${c.full_name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {r.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select
                    value={c.account_status}
                    onValueChange={(v) => void changeStatus(c.id, v as "active" | "suspended" | "deactivated")}
                  >
                    <SelectTrigger className="w-40" aria-label={`Status for ${c.full_name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

