import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { parentGuidance } from "@/data/child-adolescent";

export function ParentGuidanceSection() {
  return (
    <Section
      aria-labelledby="parent-guidance-heading"
      className="bg-surface/70"
    >
      <Container>
        <div className="max-w-3xl">
          <h2 id="parent-guidance-heading">{parentGuidance.heading}</h2>
          <p className="text-text-muted mt-4 text-base leading-relaxed md:text-lg">
            {parentGuidance.introduction}
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {parentGuidance.items.map((item, index) => (
            <li
              key={item.id}
              className="border-brand-muted/25 bg-background rounded-[var(--radius-lg)] border px-5 py-5"
            >
              <p className="text-brand-muted text-xs font-medium tracking-wide uppercase">
                Guidance {index + 1}
              </p>
              <h3 className="mt-2 font-serif text-lg text-[var(--color-brand)] md:text-xl">
                {item.title}
              </h3>
              <p className="text-text-muted mt-2 text-sm leading-relaxed md:text-base">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
