import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import {
  formatVerifiedDate,
  isSafeHttpsUrl,
  toTelHref,
} from "@/lib/crisis/schema";
import type { CrisisResource } from "@/types/crisis";

type EmergencySupportCardProps = {
  resources: CrisisResource[];
};

export function EmergencySupportCard({ resources }: EmergencySupportCardProps) {
  const featured = resources.filter((resource) =>
    [
      "emergency-response-support-system-112",
      "tele-manas",
      "child-helpline-1098",
    ].includes(resource.slug),
  );

  return (
    <Section aria-labelledby="immediate-help-heading" className="py-10">
      <Container>
        <aside
          className="border-brand-muted/45 bg-surface rounded-[var(--radius-xl)] border px-5 py-6 md:px-7"
          aria-label="When you need immediate help"
        >
          <h2 id="immediate-help-heading" className="text-xl md:text-2xl">
            When you need immediate help
          </h2>
          <p className="mt-4 text-sm leading-relaxed md:text-base">
            If you feel that you may act on thoughts of suicide or self-harm, or
            you believe you are in immediate danger, please seek emergency help
            immediately rather than waiting for a routine counselling
            appointment.
          </p>
          <p className="text-text-muted mt-3 text-sm leading-relaxed">
            This website is not an emergency service. Verified numbers below
            come only from the site&apos;s source-verified crisis directory.
          </p>

          {featured.length === 0 ? (
            <p className="mt-5 text-sm">
              Please use the Mental Health Support page for the latest verified
              information, or contact local emergency services.
            </p>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {featured.map((resource) => {
                const primary =
                  resource.phoneNumbers.find((phone) => phone.isPrimary) ??
                  resource.phoneNumbers[0];
                return (
                  <li
                    key={resource.id}
                    className="border-brand-muted/30 bg-surface-soft rounded-[var(--radius-lg)] border p-4"
                  >
                    <p className="font-medium">{resource.name}</p>
                    <p className="text-text-muted mt-1 text-sm">
                      {resource.purposeNote}
                    </p>
                    {primary ? (
                      <a
                        href={toTelHref(primary.tel)}
                        className="bg-accent text-text mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-semibold no-underline"
                        aria-label={`Call ${resource.name} at ${primary.display}`}
                      >
                        Call {primary.display}
                      </a>
                    ) : null}
                    <p className="text-text-muted mt-3 text-xs leading-relaxed">
                      Verified source: {resource.sourceAuthority}
                      <br />
                      Last verified: {formatVerifiedDate(resource.sourceVerifiedAt)}
                    </p>
                    {isSafeHttpsUrl(resource.officialSourceUrl) ? (
                      <p className="mt-2 text-xs">
                        <a
                          href={resource.officialSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand"
                        >
                          Official source
                        </a>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6">
            <ButtonLink href="/mental-health-support">
              Get Immediate Help
            </ButtonLink>
          </div>
        </aside>
      </Container>
    </Section>
  );
}
