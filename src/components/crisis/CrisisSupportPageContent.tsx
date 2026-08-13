import { CrisisDisclaimer } from "@/components/crisis/CrisisDisclaimer";
import { CrisisResourceCard } from "@/components/crisis/CrisisResourceCard";
import { SuicidalThoughtsSupport } from "@/components/crisis/SuicidalThoughtsSupport";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { CrisisResource } from "@/types/crisis";

type CrisisSupportPageProps = {
  resources: CrisisResource[];
  usedFallback: boolean;
};

function bySlug(resources: CrisisResource[], slug: string) {
  return resources.find((resource) => resource.slug === slug) ?? null;
}

export function CrisisSupportPageContent({
  resources,
  usedFallback,
}: CrisisSupportPageProps) {
  const emergency = bySlug(resources, "emergency-response-support-system-112");
  const teleManas = bySlug(resources, "tele-manas");
  const child = bySlug(resources, "child-helpline-1098");
  const others = resources.filter(
    (resource) =>
      resource.slug !== "emergency-response-support-system-112" &&
      resource.slug !== "tele-manas" &&
      resource.slug !== "child-helpline-1098",
  );

  return (
    <div className="space-y-12">
      <header className="max-w-3xl space-y-4">
        <p className="text-text-muted text-sm font-medium tracking-[0.16em] uppercase">
          Public safety information
        </p>
        <h1>Mental Health Support &amp; Emergency Help in India</h1>
        <p className="text-base leading-relaxed md:text-lg">
          If you or someone you know is experiencing a mental-health crisis,
          suicidal thoughts, or immediate danger, help is available. The
          resources below are provided from official government or authorized
          organizational sources.
        </p>
        <p className="text-brand-muted font-serif text-xl">
          Your Mental Well-being Matters.
        </p>
        <CrisisDisclaimer />
        {usedFallback ? (
          <p className="text-text-muted text-xs" role="status">
            Showing the verified national safety fallback while the live
            directory store is unavailable. Administrators should check store
            configuration.
          </p>
        ) : null}
      </header>

      <section aria-labelledby="immediate-danger-heading" className="space-y-4">
        <h2 id="immediate-danger-heading">Immediate danger</h2>
        <p className="max-w-3xl text-sm leading-relaxed md:text-base">
          If there is an immediate risk to life or serious danger, contact
          emergency services now.
        </p>
        {emergency ? (
          <CrisisResourceCard resource={emergency} emphasis="emergency" />
        ) : (
          <p>
            Call{" "}
            <a href="tel:112" className="font-semibold">
              112
            </a>{" "}
            — India&apos;s unified emergency response number (
            <a
              href="https://112.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
            >
              112.gov.in
            </a>
            ).
          </p>
        )}
      </section>

      <section aria-labelledby="mh-crisis-heading" className="space-y-4">
        <h2 id="mh-crisis-heading">24×7 mental health support</h2>
        {teleManas ? (
          <CrisisResourceCard resource={teleManas} emphasis="crisis" />
        ) : null}
      </section>

      <section aria-labelledby="child-support-heading" className="space-y-4">
        <h2 id="child-support-heading">Children &amp; adolescents</h2>
        {child ? <CrisisResourceCard resource={child} /> : null}
      </section>

      {others.length > 0 ? (
        <section aria-labelledby="other-support-heading" className="space-y-4">
          <h2 id="other-support-heading">Additional verified support</h2>
          <ul className="grid gap-5">
            {others.map((resource) => (
              <li key={resource.id}>
                <CrisisResourceCard resource={resource} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SuicidalThoughtsSupport />

      <section className="border-brand-muted/30 bg-surface max-w-3xl rounded-[var(--radius-xl)] border px-5 py-6">
        <h2 className="text-xl">Continued professional support</h2>
        <p className="mt-3 text-sm leading-relaxed md:text-base">
          After immediate safety needs are addressed, you may choose to seek
          psychological counselling. Booking an appointment is separate from
          emergency services and does not replace them.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/contact">Contact Dr. Vandana</ButtonLink>
          <ButtonLink href="/book-appointment" variant="secondary">
            Book an appointment
          </ButtonLink>
          <ButtonLink href="/stress-anxiety-wellness" variant="ghost">
            Stress &amp; wellness information
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
