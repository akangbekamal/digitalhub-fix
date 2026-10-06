import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Download, LifeBuoy, LayoutDashboard, Receipt, UserRound, Users, Menu, ShoppingBag, ShoppingCart, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
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
  const { user, profile, loading, isStaff, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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
    <main className="container-page py-4 sm:py-10">
      <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button asChild variant="outline" size="icon" className="size-10 shrink-0 overflow-hidden rounded-full" aria-label="My profile">
            <Link to="/dashboard/profile">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : <UserRound className="size-5 text-primary" />}
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Welcome back</p>
            <p className="truncate font-display text-base font-semibold">{profile?.full_name || "My account"}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button asChild variant="ghost" size="icon" className="size-10" aria-label="Notifications">
            <Link to="/dashboard/notifications"><Bell className="size-5" /></Link>
          </Button>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="size-10" aria-label="Open customer menu"><Menu className="size-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto p-4">
              <SheetTitle>My account</SheetTitle>
              <SheetDescription className="sr-only">Customer navigation</SheetDescription>
              <nav aria-label="Customer menu" className="mt-5 grid gap-1">
                {NAV.map((item) => <Button key={item.to} asChild variant={pathname.replace(/\/$/, "") === item.to ? "secondary" : "ghost"} className="justify-start" onClick={() => setMenuOpen(false)}><Link to={item.to}><item.icon className="size-4" />{item.label}</Link></Button>)}
                <div className="my-2 border-t border-border" />
                <Button asChild variant="ghost" className="justify-start" onClick={() => setMenuOpen(false)}><Link to="/shop"><ShoppingBag className="size-4" />Shop</Link></Button>
                <Button asChild variant="ghost" className="justify-start" onClick={() => setMenuOpen(false)}><Link to="/cart"><ShoppingCart className="size-4" />Cart</Link></Button>
                <Button variant="ghost" className="justify-start" onClick={() => { setMenuOpen(false); void signOut().then(() => navigate({ to: "/" })); }}><LogOut className="size-4" />Sign out</Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <div className="grid gap-4 sm:gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Dashboard" className="hidden sm:block lg:sticky lg:top-24 lg:h-fit">
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
