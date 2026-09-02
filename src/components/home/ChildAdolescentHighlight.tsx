import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { LeafIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { homeChildAdolescent } from "@/data/home";

export function ChildAdolescentHighlight() {
  return (
    <Section
      aria-labelledby="home-child-heading"
      className="bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand)_92%,black),var(--color-brand-muted))] text-white"
    >
      <Container className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-[0.16em] text-white/75 uppercase">
            For parents & caregivers
          </p>
          <h2
            id="home-child-heading"
            className="mt-3 font-serif text-[clamp(1.65rem,4vw,2.35rem)] text-white"
          >
            {homeChildAdolescent.heading}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/90 md:text-lg">
            {homeChildAdolescent.description}
          </p>
          <div className="mt-7 sm:mt-8">
            <ButtonLink
              href={homeChildAdolescent.href}
              variant="inverse"
              className="w-full sm:w-auto"
            >
              {homeChildAdolescent.ctaLabel}
            </ButtonLink>
          </div>
        </div>

        <div
          className="border-white/20 bg-white/10 rounded-[var(--radius-xl)] border p-5 backdrop-blur-[2px] sm:p-6 md:p-8"
          aria-hidden="true"
        >
          <LeafIcon className="h-10 w-10 text-white/90" />
          <p className="mt-5 font-serif text-2xl leading-snug text-white">
            Guidance that respects a child&apos;s pace and a family&apos;s care.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Support is offered through calm, non-alarming information for
            parents and caregivers exploring next steps.
          </p>
        </div>
      </Container>
    </Section>
  );
}
