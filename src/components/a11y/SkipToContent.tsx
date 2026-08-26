import { cn } from "@/lib/utils";

type SkipToContentProps = {
  href?: string;
  className?: string;
};

/**
 * Keyboard-accessible skip link. Remains visually hidden until focused.
 */
export function SkipToContent({
  href = "#main-content",
  className,
}: SkipToContentProps) {
  return (
    <a
      href={href}
      className={cn(
        "bg-surface text-text border-brand sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:left-4 focus:z-50",
        "focus:rounded-md focus:border-2 focus:px-4 focus:py-3",
        "focus:shadow-sm focus:outline-none",
        className,
      )}
    >
      Skip to main content
    </a>
  );
}
