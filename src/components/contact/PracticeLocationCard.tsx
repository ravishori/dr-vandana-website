import { DigipinCopyButton } from "@/components/contact/DigipinCopyButton";
import { GetDirectionsButton } from "@/components/contact/GetDirectionsButton";
import { MapPinIcon } from "@/components/ui/icons";
import { practiceContact } from "@/data/contact";

export function PracticeLocationCard() {
  return (
    <article className="border-brand-muted/25 bg-surface rounded-[var(--radius-xl)] border px-5 py-7 md:px-8 md:py-8">
      <header className="border-brand-muted/20 border-b pb-5">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          {practiceContact.labels.visitPractice}
        </p>
        <h2
          id="contact-location-heading"
          className="font-display text-text mt-2 text-2xl tracking-tight md:text-[1.75rem]"
        >
          {practiceContact.practiceName}
        </h2>
        <p className="text-text-muted mt-1 text-sm font-medium tracking-wide uppercase">
          {practiceContact.profession}
        </p>
      </header>

      <div className="mt-6 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div className="flex items-start gap-3">
          <span
            className="bg-brand-muted/15 text-brand mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <MapPinIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-text text-sm font-semibold tracking-wide uppercase">
              {practiceContact.labels.practiceAddress}
            </h3>
            <address className="text-text mt-2 text-sm leading-relaxed not-italic md:text-base">
              {practiceContact.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
        </div>

        <div className="border-brand-muted/20 bg-background rounded-[var(--radius-lg)] border px-4 py-4">
          <p className="text-text-muted text-xs font-semibold tracking-[0.16em] uppercase">
            {practiceContact.labels.digipin}
          </p>
          <p className="text-text mt-2 font-mono text-lg tracking-wide md:text-xl">
            {practiceContact.digipin}
          </p>
          <div className="mt-3">
            <DigipinCopyButton />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <GetDirectionsButton className="w-full sm:w-auto" />
      </div>
    </article>
  );
}
