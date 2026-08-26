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
import { setCustomerBan, setUserRole } from "@/lib/admin.functions";
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

function Page() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const query = useQuery(adminCustomersQuery());
  const runBan = useServerFn(setCustomerBan);
  const runRole = useServerFn(setUserRole);
  const [search, setSearch] = useState("");

  const term = search.trim().toLowerCase();
  const rows = (query.data ?? []).filter(
    (c) =>
      !term ||
      c.full_name.toLowerCase().includes(term) ||
      (c.email ?? "").toLowerCase().includes(term) ||
      (c.phone ?? "").toLowerCase().includes(term),
  );

  const toggleBan = async (userId: string, banned: boolean) => {
    try {
      await runBan({ data: { userId, banned, note: null } });
      toast.success(banned ? "Customer suspended" : "Customer restored");
      await qc.invalidateQueries({ queryKey: ["admin-customers"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const changeRole = async (userId: string, role: (typeof ROLES)[number]) => {
    try {
      await runRole({ data: { userId, role } });
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

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, email or phone"
        className="mt-6 max-w-sm"
      />

      <div className="mt-4">
        {query.isLoading ? (
          <LoadingState />
        ) : query.isError ? (
          <ErrorState message={(query.error as Error).message} />
        ) : (
          <ul className="space-y-2">
            {rows.map((c) => (
              <li key={c.id} className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.full_name || "Unnamed"} {c.is_banned && <span className="text-xs text-destructive">(suspended)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.email ?? "—"} · {c.phone ?? "—"} · joined {shortDate(c.created_at)} · {c.roles.join(", ") || "customer"}
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
                  <Button
                    size="sm"
                    variant={c.is_banned ? "outline" : "destructive"}
                    onClick={() => void toggleBan(c.id, !c.is_banned)}
                  >
                    {c.is_banned ? "Restore" : "Suspend"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
