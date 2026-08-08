/**
 * Decorative nature-inspired visual for the hero.
 * Used because no approved professional photograph is available yet.
 */
export function HeroVisual() {
  return (
    <div
      className="relative h-full min-h-[16rem] overflow-hidden rounded-[var(--radius-xl)] md:min-h-[22rem] lg:min-h-full"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(160deg,var(--color-brand)_0%,var(--color-brand-muted)_48%,color-mix(in_srgb,var(--color-accent)_55%,var(--color-brand-muted))_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,249,245,0.28),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(251,249,245,0.18),transparent_40%)]" />

      <svg
        className="absolute inset-0 h-full w-full opacity-35"
        viewBox="0 0 640 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M90 520c90-20 140-90 160-180 40 70 120 110 210 100-70 90-170 140-280 140-40 0-70-20-90-60z"
          fill="rgba(251,249,245,0.22)"
        />
        <path
          d="M360 180c40 70 20 140-40 190 90-10 150-70 170-150-40 10-90 10-130-40z"
          fill="rgba(251,249,245,0.18)"
        />
        <path
          d="M180 220c60-80 150-110 250-90-70 40-110 100-120 180-50-20-90-50-130-90z"
          stroke="rgba(251,249,245,0.45)"
          strokeWidth="2"
        />
        <circle cx="470" cy="150" r="48" fill="rgba(251,249,245,0.16)" />
        <circle cx="150" cy="150" r="18" fill="rgba(251,249,245,0.22)" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
        <p className="max-w-[14rem] font-serif text-2xl leading-snug text-white/95 md:text-3xl">
          Soft light. Steady support.
        </p>
        <p className="mt-2 max-w-xs text-sm text-white/80">
          A calm visual placeholder until an approved professional photograph is
          available.
        </p>
      </div>
    </div>
  );
}
