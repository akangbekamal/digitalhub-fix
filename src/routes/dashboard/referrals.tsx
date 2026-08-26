import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingState } from "@/components/StateBlocks";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { myReferralsQuery } from "@/lib/account";
import { money, shortDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — DIGITAL HUB GH" },
      { name: "description", content: "Share your DIGITAL HUB GH referral code and earn rewards." },
      { property: "og:title", content: "Referrals — DIGITAL HUB GH" },
      { property: "og:description", content: "Share your DIGITAL HUB GH referral code and earn rewards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, profile } = useAuth();
  const { referral } = useSettings();
  const query = useQuery(myReferralsQuery(user?.id));
  const rows = query.data ?? [];
  const code = profile?.referral_code ?? "";
  const link = typeof window !== "undefined" && code ? `${window.location.origin}/auth?ref=${code}` : "";

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Referrals</h1>
      <p className="mt-2 text-muted-foreground">
        {referral?.description || "Invite friends to DIGITAL HUB GH and earn a reward on their first verified order."}
      </p>

      <section className="surface-panel mt-6 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Gift className="size-5 text-primary" aria-hidden /> Your referral link
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input readOnly value={link || "Sign in to get your link"} aria-label="Referral link" className="max-w-md" />
          <Button
            type="button"
            variant="outline"
            disabled={!link}
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast.success("Referral link copied");
            }}
          >
            <Copy className="mr-2 size-4" aria-hidden /> Copy
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Code: <span className="font-semibold text-primary">{code || "—"}</span>
          {referral?.reward_amount ? ` · Reward per referral: ${money(referral.reward_amount)}` : ""}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">People you referred</h2>
        <div className="mt-3">
          {query.isLoading ? (
            <LoadingState rows={2} />
          ) : rows.length === 0 ? (
            <EmptyState title="No referrals yet" description="Share your link to start earning." />
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="surface-panel flex items-center justify-between gap-3 p-4 text-sm">
                  <span className="text-muted-foreground">Joined {shortDate(r.created_at)}</span>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <span className="font-semibold">{money(r.reward_amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
