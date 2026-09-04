import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, Download, LifeBuoy, LayoutDashboard, Receipt, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/StateBlocks";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/orders", label: "Orders", icon: Receipt },
  { to: "/dashboard/downloads", label: "Downloads", icon: Download },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/support", label: "Support", icon: LifeBuoy },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/profile", label: "Profile", icon: UserRound },
] as const;

function Layout() {
  const { user, loading, isStaff } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isStaff) {
      void navigate({ to: "/admin", replace: true });
    }
  }, [loading, isStaff, navigate]);

  if (loading) {
    return (
      <main className="container-page py-16">
        <LoadingState label="Loading your account…" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container-page py-16">
        <EmptyState
          title="Sign in to view your dashboard"
          description="Your orders, downloads and support conversations live here."
          action={
            <Button asChild>
              <Link to="/auth" search={{ redirect: "/dashboard" }}>
                Sign in or create account
              </Link>
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Dashboard" className="lg:sticky lg:top-24 lg:h-fit">
          <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {NAV.map((item) => {
              const active = item.to === "/dashboard" ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <li key={item.to} className="shrink-0 snap-start">
                  <Link
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
