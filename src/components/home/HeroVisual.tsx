/**
 * Decorative nature-inspired visual for the hero.
 * Used because no approved professional photograph is available yet.
 */
export function HeroVisual() {
  return (
    <div
      className="relative h-full min-h-[18rem] overflow-hidden rounded-[var(--radius-xl)] shadow-[var(--shadow-md)] sm:min-h-[20rem] md:min-h-[24rem] lg:min-h-full"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(155deg,var(--color-brand)_0%,var(--color-brand-muted)_52%,color-mix(in_srgb,var(--color-accent)_45%,var(--color-brand-muted))_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.28),transparent_42%),radial-gradient(circle_at_82%_78%,rgba(255,255,255,0.14),transparent_38%)]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        viewBox="0 0 640 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M90 520c90-20 140-90 160-180 40 70 120 110 210 100-70 90-170 140-280 140-40 0-70-20-90-60z"
          fill="rgba(255,255,255,0.22)"
        />
        <path
          d="M360 180c40 70 20 140-40 190 90-10 150-70 170-150-40 10-90 10-130-40z"
          fill="rgba(255,255,255,0.16)"
        />
        <path
          d="M180 220c60-80 150-110 250-90-70 40-110 100-120 180-50-20-90-50-130-90z"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="2"
        />
        <circle cx="470" cy="150" r="48" fill="rgba(255,255,255,0.14)" />
        <circle cx="150" cy="150" r="18" fill="rgba(255,255,255,0.2)" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/25 to-transparent p-5 sm:p-6 md:p-8">
        <p className="max-w-[16rem] font-serif text-2xl leading-snug text-white sm:text-3xl">
          Soft light. Steady support.
        </p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/85">
          A calm visual space for psychological wellbeing and thoughtful care.
        </p>
      </div>
    </div>
  );
}
