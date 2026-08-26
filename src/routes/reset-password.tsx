import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — DIGITAL HUB GH" },
      { name: "description", content: "Choose a new password for your DIGITAL HUB GH account." },
      { property: "og:title", content: "Reset Password — DIGITAL HUB GH" },
      { property: "og:description", content: "Choose a new password for your DIGITAL HUB GH account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      console.error("[auth] password update failed", error);
      toast.error(`Password update failed: ${error.message}`);
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/dashboard" });
  };

  return (
    <main className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center font-display text-3xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-center text-muted-foreground">
          Open this page from the reset link in your email, then choose a new password.
        </p>
        <form onSubmit={submit} className="surface-panel mt-8 space-y-4 p-6">
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Update password
          </Button>
        </form>
      </div>
    </main>
  );
}
