import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

/** Collapses secondary fields on phones while leaving desktop content expanded. */
export function MobileDetails({ children, label = "Details" }: { children: React.ReactNode; label?: string }) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  return <details open={!isMobile || expanded} onToggle={(event) => { if (isMobile) setExpanded(event.currentTarget.open); }} className="admin-secondary"><summary className="mt-2 min-h-11 cursor-pointer border-t border-border py-3 text-xs font-medium text-muted-foreground md:hidden">{label}</summary>{children}</details>;
}