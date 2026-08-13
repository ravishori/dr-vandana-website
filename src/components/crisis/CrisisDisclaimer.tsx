import { CRISIS_PAGE_DISCLAIMER } from "@/data/crisis/seed";

export function CrisisDisclaimer({ className }: { className?: string }) {
  return (
    <aside
      className={
        className ??
        "border-brand-muted/40 bg-surface-soft rounded-[var(--radius-lg)] border px-5 py-4"
      }
      role="note"
    >
      <p className="text-text text-sm leading-relaxed">{CRISIS_PAGE_DISCLAIMER}</p>
    </aside>
  );
}
