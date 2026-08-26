import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({
    meta: [
      { title: "Profile Settings — DIGITAL HUB GH" },
      { name: "description", content: "Update your name, phone and password for DIGITAL HUB GH." },
      { property: "og:title", content: "Profile Settings — DIGITAL HUB GH" },
      { property: "og:description", content: "Update your name, phone and password for DIGITAL HUB GH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profile updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Profile</h1>
      <p className="mt-2 text-muted-foreground">Keep your contact details up to date so we can deliver your orders.</p>

      <form onSubmit={save} className="surface-panel mt-6 max-w-xl space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Account details</h2>
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
        </div>
        <div>
          <Label htmlFor="phone">Phone (MoMo number)</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 000 0000" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profile?.email ?? user?.email ?? ""} readOnly disabled />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </form>

      <form onSubmit={changePassword} className="surface-panel mt-6 max-w-xl space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pwBusy}>
          {pwBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Update password
        </Button>
      </form>

      <div className="mt-6">
        <Button variant="ghost" onClick={() => void signOut()}>
          <LogOut className="mr-2 size-4" aria-hidden /> Sign out
        </Button>
      </div>
    </div>
  );
}
