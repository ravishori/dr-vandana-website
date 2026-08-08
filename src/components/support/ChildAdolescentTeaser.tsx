import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { LeafIcon } from "@/components/ui/icons";
import { Section } from "@/components/ui/Section";
import { childAdolescentTeaser } from "@/data/support";

export function ChildAdolescentTeaser() {
  return (
    <Section
      aria-labelledby="support-child-teaser-heading"
      className="bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand)_92%,black),var(--color-brand-muted))] text-white"
    >
      <Container className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_auto] lg:items-center">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-[0.16em] text-white/75 uppercase">
            For parents & caregivers
          </p>
          <h2
            id="support-child-teaser-heading"
            className="mt-3 font-serif text-[clamp(1.7rem,3vw,2.25rem)] text-white"
          >
            {childAdolescentTeaser.heading}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/90 md:text-lg">
            {childAdolescentTeaser.description}
          </p>
          <div className="mt-8">
            <ButtonLink href={childAdolescentTeaser.href} variant="inverse">
              {childAdolescentTeaser.ctaLabel}
            </ButtonLink>
          </div>
        </div>

        <div
          className="border-white/20 bg-white/10 inline-flex h-16 w-16 items-center justify-center rounded-full border"
          aria-hidden="true"
        >
          <LeafIcon className="h-7 w-7 text-white" />
        </div>
      </Container>
    </Section>
  );
}
