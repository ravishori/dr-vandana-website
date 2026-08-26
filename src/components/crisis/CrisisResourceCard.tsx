import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  formatVerifiedDate,
  isSafeHttpsUrl,
  toTelHref,
} from "@/lib/crisis/schema";
import type { CrisisResource } from "@/types/crisis";
import { cn } from "@/lib/utils";

type CrisisResourceCardProps = {
  resource: CrisisResource;
  emphasis?: "emergency" | "crisis" | "default";
};

export function CrisisResourceCard({
  resource,
  emphasis = "default",
}: CrisisResourceCardProps) {
  const primary = resource.phoneNumbers.find((phone) => phone.isPrimary);
  const shellClass =
    emphasis === "emergency"
      ? "border-[color-mix(in_srgb,var(--color-danger,#9b2c2c)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-danger,#9b2c2c)_6%,var(--color-surface))]"
      : emphasis === "crisis"
        ? "border-brand-muted/50 bg-surface"
        : "border-brand-muted/30 bg-surface";

  return (
    <article
      className={cn(
        "rounded-[var(--radius-xl)] border p-5 shadow-[var(--shadow-sm)] md:p-6",
        shellClass,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-surface-soft text-brand rounded-full px-2.5 py-1 font-medium">
          {resource.shortName}
        </span>
        <span className="rounded-full border border-brand-muted/35 px-2.5 py-1">
          Verified official source
        </span>
        <span className="rounded-full border border-brand-muted/35 px-2.5 py-1">
          {resource.availability}
        </span>
      </div>

      <h3 className="mt-4 text-2xl">{resource.name}</h3>
      <p className="text-brand-muted mt-2 font-serif text-lg">
        {resource.purposeNote}
      </p>
      <p className="mt-4 text-sm leading-relaxed md:text-base">
        {resource.description}
      </p>

      <dl className="text-text-muted mt-5 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-[var(--color-text)]">Coverage</dt>
          <dd>{resource.coverage}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-text)]">Organization</dt>
          <dd>{resource.organization}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-text)]">Last verified</dt>
          <dd>{formatVerifiedDate(resource.sourceVerifiedAt)}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-text)]">Source authority</dt>
          <dd>{resource.sourceAuthority}</dd>
        </div>
      </dl>

      <ul className="mt-6 flex flex-col gap-3">
        {resource.phoneNumbers.map((phone) => (
          <li key={`${resource.id}-${phone.tel}`}>
            <a
              href={toTelHref(phone.tel)}
              className={cn(
                "inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] px-4 text-base font-semibold no-underline sm:w-auto sm:min-w-[14rem]",
                phone.isPrimary || phone === primary
                  ? emphasis === "emergency"
                    ? "bg-[var(--color-danger,#9b2c2c)] text-white"
                    : "bg-accent text-text"
                  : "border-brand-muted bg-surface text-brand border",
              )}
              aria-label={`Call ${resource.name} at ${phone.display}`}
            >
              Call {phone.display}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-3">
        {isSafeHttpsUrl(resource.officialSourceUrl) ? (
          <ButtonLink
            href={resource.officialSourceUrl}
            external
            variant="secondary"
            aria-label={`Official source for ${resource.name}`}
          >
            Official source
          </ButtonLink>
        ) : null}
        {resource.officialWebsite &&
        isSafeHttpsUrl(resource.officialWebsite) &&
        resource.officialWebsite !== resource.officialSourceUrl ? (
          <ButtonLink
            href={resource.officialWebsite}
            external
            variant="ghost"
            aria-label={`Official website for ${resource.name}`}
          >
            Official website
          </ButtonLink>
        ) : null}
      </div>
    </article>
  );
}
