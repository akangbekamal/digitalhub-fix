// src/components/layout/MaintenanceGate.tsx
// Renders a maintenance notice for normal visitors while leaving
// /admin (staff) and /auth reachable. No router redirects, so nothing
// about TanStack Router's matching changes.
//
// Fails OPEN: if settings are loading, errored, or unavailable, the site
// renders normally instead of blocking visitors.

import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";

const ALWAYS_ALLOWED_PREFIXES = ["/admin", "/auth", "/login"];

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { settings, isLoading, isError } = useSettings();
  const auth = useAuth();
  const isStaff = Boolean(auth?.isStaff);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const exempt =
    isStaff ||
    ALWAYS_ALLOWED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

  const blocked =
    !isLoading && !isError && Boolean(settings?.maintenance_mode) && !exempt;

  if (!blocked) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          We&apos;ll be right back
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {settings.maintenance_message}
        </p>
        {settings.whatsapp && (
          <p className="mt-4 text-sm text-muted-foreground">
            Need help now? WhatsApp us on {settings.whatsapp}.
          </p>
        )}
      </div>
    </div>
  );
}
