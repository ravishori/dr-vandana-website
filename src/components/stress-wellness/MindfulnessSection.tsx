import { Container } from "@/components/ui/Container";
import { LeafIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { mindfulnessSection } from "@/data/stress-wellness";

export function MindfulnessSection() {
  return (
    <Section aria-labelledby="mindfulness-heading">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <span className="bg-surface text-brand border-brand-muted/25 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border">
            <LeafIcon className="h-5 w-5" />
          </span>
          <div className="max-w-3xl">
            <h2 id="mindfulness-heading">{mindfulnessSection.heading}</h2>
            <p className="text-text mt-4 text-base leading-relaxed md:text-lg">
              {mindfulnessSection.lead}
            </p>
          </div>
        </div>

        <ul className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {mindfulnessSection.practices.map((practice) => (
            <li key={practice.id} className="max-w-md">
              <h3 className="font-serif text-xl text-[var(--color-brand)]">
                {practice.title}
              </h3>
              <p className="text-text-muted mt-2 text-sm leading-relaxed md:text-base">
                {practice.description}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
