import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  referral_code: string | null;
  is_banned: boolean;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  isStaff: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  roleError: string | null;
  staffFallback: boolean;
  projectUrl: string;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const SUPABASE_PROJECT_URL =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ??
  "(VITE_SUPABASE_URL not set)";

const AuthContext = createContext<AuthValue | null>(null);

const STAFF_ROLES = [
  "admin",
  "super_admin",
  "support_admin",
  "product_admin",
  "order_admin",
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [staffFallback, setStaffFallback] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const queryClient = useQueryClient();

  const load = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setRoles([]);
      setStaffFallback(false);
      setRoleError(null);
      return;
    }

    // Load profile
    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (pErr) {
      console.error("[auth] profile load failed", pErr);
    }

    setProfile((p as Profile) ?? null);

    // Load roles
    const { data: r, error: rErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);

    if (rErr) {
      console.error("[auth] user_roles query failed", rErr);
      setRoleError(rErr.message);
    } else {
      setRoleError(null);
    }

    const found = (r ?? []).map(
      (row: { role: string }) => row.role,
    );

    setRoles(found);

    // Check staff role directly first
    if (found.some((role) => STAFF_ROLES.includes(role))) {
      setStaffFallback(false);
    } else {
      // Fallback to security-definer is_staff() function
      const { data: staff, error: sErr } = await supabase.rpc(
        "is_staff",
        { _user_id: uid },
      );

      console.log("[auth] STAFF CHECK", {
        uid,
        staff,
        error: sErr,
        projectUrl: SUPABASE_PROJECT_URL,
      });

      if (sErr) {
        console.error("[auth] is_staff() rpc failed", sErr);
        setStaffFallback(false);
      } else {
        setStaffFallback(staff === true);
      }
    }

    console.info("[auth] identity", {
      uid,
      roles: found,
      rolesError: rErr?.message ?? null,
    });
  };

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (!active) return;

        setSession(s);

        if (event === "SIGNED_OUT") {
          setProfile(null);
          setRoles([]);
          setStaffFallback(false);
          setRoleError(null);
          queryClient.clear();
          return;
        }

        if (s?.user) {
          setTimeout(() => {
            void load(s.user.id);
          }, 0);
        }
      },
    );

    void (async () => {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      setSession(data.session);

      await load(data.session?.user.id);

      setLoading(false);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      roles,
      isStaff:
        roles.some((r) => STAFF_ROLES.includes(r)) ||
        staffFallback,
      isSuperAdmin: roles.includes("super_admin"),
      loading,
      roleError,
      staffFallback,
      projectUrl: SUPABASE_PROJECT_URL,

      refreshProfile: async () => {
        await load(session?.user.id);
      },

      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
      },
    }),
    [
      session,
      profile,
      roles,
      loading,
      staffFallback,
      roleError,
      queryClient,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}
