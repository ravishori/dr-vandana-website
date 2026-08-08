type AboutNatureVisualProps = {
  caption?: string;
  detail?: string;
};

/**
 * Nature-inspired decorative visual for the About hero.
 * Used because no approved professional photograph is available yet.
 */
export function AboutNatureVisual({
  caption = "Calm presence. Thoughtful care.",
  detail = "An elegant visual placeholder until an approved professional photograph is available.",
}: AboutNatureVisualProps) {
  return (
    <div
      className="relative h-full min-h-[15rem] overflow-hidden rounded-[var(--radius-xl)] md:min-h-[20rem] lg:min-h-full"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(150deg,var(--color-brand)_0%,var(--color-brand-muted)_52%,color-mix(in_srgb,var(--color-accent)_40%,var(--color-brand-muted))_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(251,249,245,0.26),transparent_42%),radial-gradient(circle_at_78%_70%,rgba(251,249,245,0.16),transparent_38%)]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 640 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M120 480c80-40 130-110 150-190 50 60 130 95 210 80-80 100-190 150-300 150-30 0-50-15-60-40z"
          fill="rgba(251,249,245,0.22)"
        />
        <path
          d="M390 200c30 80 10 150-50 200 100-20 170-80 190-170-50 20-100 20-140-30z"
          fill="rgba(251,249,245,0.16)"
        />
        <path
          d="M200 250c70-90 170-120 270-90-80 50-120 110-130 190-60-30-100-60-140-100z"
          stroke="rgba(251,249,245,0.5)"
          strokeWidth="2"
        />
        <circle cx="480" cy="160" r="40" fill="rgba(251,249,245,0.14)" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
        <p className="max-w-[15rem] font-serif text-2xl leading-snug text-white/95 md:text-3xl">
          {caption}
        </p>
        <p className="mt-2 max-w-xs text-sm text-white/80">{detail}</p>
      </div>
    </div>
  );
}
