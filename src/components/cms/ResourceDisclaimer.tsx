import { resourceLibraryDisclaimer } from "@/config/cms";

export function ResourceDisclaimer() {
  return (
    <aside
      id="disclaimer"
      className="rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface-soft px-4 py-3 text-sm text-text-muted"
      role="note"
    >
      {resourceLibraryDisclaimer}
    </aside>
  );
}
