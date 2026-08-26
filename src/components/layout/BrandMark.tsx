import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
};

export function BrandMark({
  className,
  compact = false,
  showTagline = false,
}: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "text-brand hover:text-brand focus-visible:outline-brand block no-underline",
        className,
      )}
      aria-label={`${siteConfig.professionalName}, ${siteConfig.profession}, home`}
    >
      <span
        className={cn(
          "font-serif font-semibold tracking-tight",
          compact ? "text-base leading-snug sm:text-lg" : "text-lg leading-snug",
        )}
      >
        {siteConfig.professionalName}
      </span>
      <span
        className={cn(
          "text-text-muted block font-sans font-normal tracking-wide uppercase",
          compact ? "mt-0.5 text-[0.65rem]" : "mt-1 text-xs",
        )}
      >
        {siteConfig.profession}
      </span>
      {showTagline ? (
        <span className="text-text-muted mt-2 block font-sans text-sm normal-case tracking-normal">
          {siteConfig.tagline}
        </span>
      ) : null}
    </Link>
  );
}
