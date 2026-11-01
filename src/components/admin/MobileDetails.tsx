import { useEffect, useState } from "react";

/** Collapses secondary fields on phones while leaving desktop content expanded. */
export function MobileDetails({ children, label = "Details" }: { children: React.ReactNode; label?: string }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const media = window.matchMedia("(max-width: 639px)"); const update = () => setIsMobile(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  const [expanded, setExpanded] = useState(false);
  return <details open={!isMobile || expanded} onToggle={(event) => { if (isMobile) setExpanded(event.currentTarget.open); }} className="admin-secondary"><summary className="mt-2 min-h-11 cursor-pointer border-t border-border py-3 text-xs font-medium text-muted-foreground sm:hidden">{label}</summary>{children}</details>;
}