import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Database,
  LifeBuoy,
  MailPlus,
  Megaphone,
  Package,
  PieChart,
  Receipt,
  Settings,
  Users,
  Menu,
  ShieldCheck,
  UserRound,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/StateBlocks";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { AdminNotificationsBell } from "@/components/layout/AdminNotificationsBell";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin")({
  component: Layout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: BarChart3 },
  { to: "/admin/orders", label: "Orders & payments", icon: Receipt },
  { to: "/admin/products", label: "Catalog", icon: Package },
  { to: "/admin/inventory", label: "Digital Inventory", icon: Database },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/support", label: "Support & reviews", icon: LifeBuoy },
  { to: "/admin/messages", label: "Message Center", icon: MailPlus },
  { to: "/admin/analytics", label: "Analytics", icon: PieChart },
  { to: "/admin/activity", label: "Activity Log", icon: Activity },
  { to: "/admin/marketing", label: "Coupons & news", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

const GROUPS = [
  { label: "Control panel", items: [{ to: "/admin", label: "Overview", icon: BarChart3 }] },
  { label: "Store", items: [{ to: "/admin/products", label: "Catalog", icon: Package }, { to: "/admin/products", label: "Categories", icon: Package, hash: "categories" }, { to: "/admin/inventory", label: "Digital Inventory", icon: Database }] },
  { label: "Orders", items: [{ to: "/admin/orders", label: "Orders & Payments", icon: Receipt, hash: "orders" }, { to: "/admin/support", label: "Refunds", icon: Receipt, hash: "refunds" }] },
  { label: "Customers", items: [{ to: "/admin/customers", label: "Customers", icon: Users }, { to: "/admin/support", label: "Support & Reviews", icon: LifeBuoy }] },
  { label: "Communication", items: [{ to: "/admin/messages", label: "Message Center", icon: MailPlus }, { to: "/admin", label: "Notifications", icon: MailPlus, hash: "notifications" }] },
  { label: "Marketing", items: [{ to: "/admin/marketing", label: "Coupons & News", icon: Megaphone }, { to: "/admin/marketing", label: "Promotions", icon: Megaphone, hash: "coupons" }] },
  { label: "Analytics", items: [{ to: "/admin/analytics", label: "Analytics", icon: PieChart }, { to: "/admin/activity", label: "Activity Log", icon: Activity }] },
  { label: "Settings", items: [{ to: "/admin/settings", label: "Store Settings", icon: Settings }, { to: "/admin/settings", label: "Payment Settings", icon: Receipt, hash: "payment-settings" }, { to: "/admin/settings", label: "Email & Notifications", icon: MailPlus, hash: "email-notifications" }, { to: "/admin/settings", label: "Security", icon: ShieldCheck, hash: "security" }, { to: "/admin/customers", label: "Admin Users", icon: Users }] },
] as const;


function Diagnostics() {
  const { user, roles, roleError, isStaff, staffFallback, projectUrl } = useAuth();
  return (
    <details className="mt-8 rounded-xl border border-border bg-muted/40 p-4 text-left text-xs">
      <summary className="cursor-pointer font-medium">Access diagnostics</summary>
      <dl className="mt-3 grid gap-1 font-mono text-muted-foreground">
        <div>UID: {user?.id ?? "— (not signed in)"}</div>
        <div>Email: {user?.email ?? "—"}</div>
        <div>Roles: {roles.length ? roles.join(", ") : "none returned"}</div>
        <div>Role query error: {roleError ?? "none"}</div>
        <div>is_staff() fallback: {String(staffFallback)}</div>
        <div>isStaff: {String(isStaff)}</div>
        <div>Backend URL: {projectUrl}</div>
      </dl>
    </details>
  );
}

function Layout() {
  const { user, profile, isStaff, loading, roleError, roles, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <main className="container-page py-16">
        <LoadingState label="Checking your access…" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container-page py-16">
        <EmptyState
          title="Sign in required"
          description="Sign in with your staff account to open the admin area."
          action={
            <Button asChild>
              <Link to="/auth" search={{ redirect: "/admin" }}>
                Sign in
              </Link>
            </Button>
          }
        />
        <Diagnostics />
      </main>
    );
  }

  if (!isStaff) {
    return (
      <main className="container-page py-16">
        <EmptyState
          title="Staff access only"
          description={
            roleError
              ? `We could not read your roles from the database: ${roleError}`
              : `This area is restricted to DIGITAL HUB GH administrators. Signed in as ${user.email} (${user.id}) with roles: ${roles.length ? roles.join(", ") : "none"}.`
          }
          action={
            <Button asChild>
              <Link to="/dashboard">Go to my dashboard</Link>
            </Button>
          }
        />
        <Diagnostics />
      </main>
    );
  }


  return (
    <main className="admin-mobile container-page py-4 sm:py-10">
      <header className="sticky top-0 z-40 -mx-4 -mt-4 mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-xl sm:hidden">
        <Link to="/admin" className="flex min-w-0 items-center gap-2">
          <ShieldCheck className="size-6 shrink-0 text-primary" />
          <div className="min-w-0"><p className="truncate font-display text-sm font-bold">DigitalHubGH</p><p className="text-[10px] font-medium uppercase text-muted-foreground">Admin control</p></div>
        </Link>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon" className="size-11" aria-label={`Admin profile: ${profile?.full_name || "Administrator"}`} onClick={() => setMenuOpen(true)}><UserRound className="size-4" /></Button>
          <AdminNotificationsBell compact />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="size-11" aria-label="Open admin navigation"><Menu className="size-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="admin-drawer flex w-[calc(100vw-2rem)] max-w-sm flex-col p-0 [&>button]:grid [&>button]:size-11 [&>button]:place-items-center [&>button]:right-1 [&>button]:top-1">
              <div className="border-b border-border p-4 pr-14"><SheetTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-5 text-primary" />DigitalHubGH Admin</SheetTitle><SheetDescription className="mt-1 truncate text-xs">{profile?.full_name || "Administrator"}</SheetDescription></div>
              <nav aria-label="Admin mobile navigation" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                {GROUPS.map((group) => <div key={group.label} className="mt-4"><p className="mb-1 px-3 text-[10px] font-semibold uppercase text-muted-foreground">{group.label}</p>{group.items.map((item) => { const itemHash = "hash" in item ? item.hash : undefined; return <Link key={item.label} to={item.to} hash={itemHash} onClick={() => setMenuOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-sm", pathname === item.to && hash === (itemHash ?? "") ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted")}><item.icon className="size-4 shrink-0 text-muted-foreground" />{item.label}</Link>; })}</div>)}
              </nav>
              <div className="border-t border-border p-3"><Button variant="ghost" className="h-11 w-full justify-start" onClick={() => void signOut()}><LogOut className="mr-2 size-4" />Sign out</Button></div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Admin" className="hidden sm:block lg:sticky lg:top-24 lg:h-fit">
          <AdminNotificationsBell />
          <ul className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {NAV.map((item) => {
              const active = item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);
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
        <div className="admin-content min-w-0">
          <Outlet />
        </div>
      </div>
      <Diagnostics />
    </main>
  );
}
