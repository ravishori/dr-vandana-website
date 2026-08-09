import { MapPinIcon } from "@/components/ui/icons";
import { practiceContact } from "@/data/contact";
import { getMapsHref } from "@/lib/contact-actions";
import { cn } from "@/lib/utils";

type GetDirectionsButtonProps = {
  className?: string;
  /** visual: primary brand CTA; secondary: quieter footer-style link look */
  variant?: "primary" | "secondary";
};

export function GetDirectionsButton({
  className,
  variant = "primary",
}: GetDirectionsButtonProps) {
  return (
    <a
      href={getMapsHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={practiceContact.labels.mapsAria}
      className={cn(
        "inline-flex min-h-[var(--touch-target-min)] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 text-sm font-medium no-underline transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none sm:w-auto",
        variant === "primary"
          ? "bg-brand text-surface hover:bg-brand/90 border border-transparent shadow-sm"
          : "bg-surface text-brand border-brand-muted hover:border-brand hover:bg-background border",
        className,
      )}
    >
      <MapPinIcon className="h-4 w-4" aria-hidden="true" />
      <span>{practiceContact.labels.getDirections}</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
