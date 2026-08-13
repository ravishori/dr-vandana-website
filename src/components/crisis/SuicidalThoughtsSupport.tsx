export function SuicidalThoughtsSupport() {
  return (
    <section
      aria-labelledby="suicidal-thoughts-heading"
      className="border-brand-muted/30 bg-surface-soft rounded-[var(--radius-xl)] border px-5 py-6 md:px-6"
    >
      <h2 id="suicidal-thoughts-heading" className="text-xl md:text-2xl">
        If you are having thoughts of suicide or feel you may hurt yourself
      </h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed md:text-base">
        <p>Please do not face this moment alone.</p>
        <p>
          If you are in immediate danger, call{" "}
          <a href="tel:112" className="text-brand font-medium">
            112
          </a>{" "}
          or go to the nearest emergency department.
        </p>
        <p>
          For mental-health support, you can contact Tele-MANAS at{" "}
          <a href="tel:14416" className="text-brand font-medium">
            14416
          </a>
          .
        </p>
        <p>
          If possible, stay with someone you trust and move away from anything
          you could use to hurt yourself.
        </p>
        <p className="text-text-muted">
          This website cannot keep you safe by itself and is not a substitute
          for emergency services or in-person care.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="tel:112"
          className="bg-accent text-text inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-semibold no-underline"
          aria-label="Call 112"
        >
          Call 112
        </a>
        <a
          href="tel:14416"
          className="border-brand-muted bg-surface text-brand inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border px-5 text-sm font-semibold no-underline"
          aria-label="Call Tele-MANAS at 14416"
        >
          Call Tele-MANAS 14416
        </a>
      </div>
    </section>
  );
}
