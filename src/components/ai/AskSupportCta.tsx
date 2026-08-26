import { ButtonLink } from "@/components/ui/ButtonLink";

export function AskSupportCta() {
  return (
    <aside className="border-brand-muted/25 bg-surface-soft rounded-[var(--radius-lg)] border p-5">
      <p className="text-text text-base leading-relaxed">
        Would you like to discuss your concerns with a psychologist?
      </p>
      <div className="mt-4">
        <ButtonLink href="/contact">Contact Dr. Vandana</ButtonLink>
      </div>
    </aside>
  );
}
