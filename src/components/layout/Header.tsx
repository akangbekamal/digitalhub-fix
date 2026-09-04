import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  Search,
  ShoppingCart,
  User as UserIcon,
  LayoutDashboard,
  Package,
  Download,
  Bell,
  LifeBuoy,
  Users,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

const ACCOUNT_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/orders", label: "My Orders", icon: Package },
  { to: "/dashboard/downloads", label: "Downloads", icon: Download },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/support", label: "Support", icon: LifeBuoy },
  { to: "/dashboard/referrals", label: "Referrals", icon: Users },
  { to: "/dashboard/profile", label: "Profile", icon: Settings },
] as const;

export function Header() {
  const { user, isStaff, signOut, profile } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/shop", search: { q: term.trim() || undefined } });
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 shrink-0 lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-xs bg-sidebar p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="border-b border-sidebar-border p-4">
              <Logo />
            </div>
            <nav className="flex flex-col p-2">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
                  activeProps={{ className: "bg-sidebar-accent text-primary" }}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-sidebar-border" />
              {user ? (
                <>
                  {!isStaff &&
                    ACCOUNT_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                      >
                        <item.icon className="size-4" /> {item.label}
                      </Link>
                    ))}
                  {isStaff && (
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-sidebar-accent"
                    >
                      <Shield className="size-4" /> Admin Dashboard
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="min-w-0 shrink">
          <Logo />
        </div>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button variant="ghost" size="icon" className="size-10 shrink-0 md:hidden" asChild aria-label="Search">
            <Link to="/shop">
              <Search className="size-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="size-10 shrink-0 md:size-9" asChild aria-label={`Cart, ${count} items`}>
            <Link to="/cart" className="relative">
              <ShoppingCart className="size-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-10 shrink-0 md:size-9" aria-label="Account menu">
                <UserIcon className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuLabel className="truncate">
                    {profile?.full_name || user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!isStaff &&
                    ACCOUNT_LINKS.map((item) => (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to}>
                          <item.icon className="mr-2 size-4" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  {isStaff && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="font-semibold text-primary">
                          <Shield className="mr-2 size-4" /> Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      void signOut().then(() => navigate({ to: "/" }));
                    }}
                  >
                    <LogOut className="mr-2 size-4" /> Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/auth">Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Create Account
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
