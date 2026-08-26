import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Database,
  LifeBuoy,
  Megaphone,
  Package,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/StateBlocks";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { AdminNotificationsBell } from "@/components/layout/AdminNotificationsBell";

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
  { to: "/admin/marketing", label: "Coupons & news", icon: Megaphone },
  { to: "/admin/settings", label: "Settings", icon: Settings },
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
  const { user, isStaff, loading, roleError, roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
    <main className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Admin" className="lg:sticky lg:top-24 lg:h-fit">
          <AdminNotificationsBell />
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {NAV.map((item) => {
              const active = item.to === "/admin" ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <li key={item.to} className="shrink-0">
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
      <Diagnostics />
    </main>
  );
}
