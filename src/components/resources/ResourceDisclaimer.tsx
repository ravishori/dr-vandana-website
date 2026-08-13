import { RESOURCE_DISCLAIMER } from "@/data/resources/seed";

export function ResourceDisclaimer({ className }: { className?: string }) {
  return (
    <aside
      className={
        className ??
        "border-brand-muted/40 bg-surface-soft rounded-[var(--radius-lg)] border px-5 py-4"
      }
      role="note"
    >
      <p className="text-text text-sm leading-relaxed">{RESOURCE_DISCLAIMER}</p>
    </aside>
  );
}
