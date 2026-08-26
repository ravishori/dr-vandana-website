import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export function ConfidentialityNotice() {
  return (
    <Section aria-labelledby="confidentiality-notice-heading" className="py-8">
      <Container>
        <aside
          className="border-brand-muted/30 bg-surface max-w-3xl rounded-[var(--radius-xl)] border px-5 py-5"
          role="note"
        >
          <h2 id="confidentiality-notice-heading" className="text-lg">
            Privacy &amp; confidentiality
          </h2>
          <p className="mt-3 text-sm leading-relaxed md:text-base">
            Confidentiality is an important part of professional psychological
            practice. Information shared during counselling is generally treated
            with privacy and respect. Confidentiality is not absolute and may
            have ethical or legal limits in certain circumstances, particularly
            where there are serious safety concerns. Details can be discussed at
            the beginning of counselling.
          </p>
        </aside>
      </Container>
    </Section>
  );
}
