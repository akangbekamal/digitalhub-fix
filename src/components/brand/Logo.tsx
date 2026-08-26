import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="DIGITAL HUB GH home">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary font-display text-base font-bold text-primary-foreground shadow-glow">
        DH
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[15px] font-bold tracking-tight">DIGITAL HUB</span>
          <span className="block text-[11px] font-semibold tracking-[0.28em] text-primary">GH</span>
        </span>
      )}
    </Link>
  );
}
