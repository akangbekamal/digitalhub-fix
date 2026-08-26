import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Sign Up — DIGITAL HUB GH" },
      { name: "description", content: "Access your DIGITAL HUB GH account to track orders and downloads." },
      { property: "og:title", content: "Login or Sign Up — DIGITAL HUB GH" },
      { property: "og:description", content: "Access your DIGITAL HUB GH account to track orders and downloads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: z.object({ mode: z.enum(["login", "signup"]).optional(), redirect: z.string().optional() }),
  component: Page,
});

function Page() {
  const { mode, redirect } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(mode ?? "login");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const safeRedirect = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  useEffect(() => {
    if (user) void navigate({ to: safeRedirect });
  }, [user, safeRedirect, navigate]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      console.error("[auth] sign-in failed", error);
      toast.error(`Login failed: ${error.message}`);
      return;
    }
    toast.success("Welcome back!");
  };

  const forgotPassword = async () => {
    if (!email.trim()) {
      toast.error("Enter your email first, then tap reset.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      console.error("[auth] reset email failed", error);
      toast.error(`Reset failed: ${error.message}`);
      return;
    }
    toast.success("Reset link sent", { description: "Check your inbox for the password reset email." });
  };


  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created", { description: "You can now sign in and start shopping." });
    setTab("login");
  };

  return (
    <main className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center font-display text-3xl font-bold tracking-tight">Account access</h1>
        <p className="mt-2 text-center text-muted-foreground">Track orders, get downloads and reach support.</p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")} className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={login} className="surface-panel space-y-4 p-6">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Sign in
              </Button>
              <button
                type="button"
                onClick={() => void forgotPassword()}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot your password?
              </button>

            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signup} className="surface-panel space-y-4 p-6">
              <div>
                <Label htmlFor="su-name">Full name</Label>
                <Input id="su-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
              </div>
              <div>
                <Label htmlFor="su-phone">Phone (MoMo number)</Label>
                <Input id="su-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 000 0000" />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="su-password">Password</Label>
                <Input
                  id="su-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/policies/$slug" params={{ slug: "terms" }} className="text-primary hover:underline">
            terms
          </Link>{" "}
          and{" "}
          <Link to="/policies/$slug" params={{ slug: "privacy" }} className="text-primary hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
