import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/format";

const toneClass: Record<string, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        toneClass[statusTone(status)],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}
