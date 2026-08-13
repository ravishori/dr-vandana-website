import { psychologistLogoutAction } from "@/app/psychologist/login/actions";
import { ButtonLink } from "@/components/ui/ButtonLink";
import type { PsychologistSession } from "@/types/question-portal";

export function PsychologistPortalNav({
  session,
}: {
  session: PsychologistSession;
}) {
  return (
    <div className="border-brand-muted/25 bg-surface-soft border-b">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-[var(--space-page-x)] py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          Psychologist Portal · signed in as {session.email}
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/psychologist" variant="secondary">
            Dashboard
          </ButtonLink>
          <ButtonLink href="/psychologist/questions" variant="secondary">
            Questions
          </ButtonLink>
          <ButtonLink href="/psychologist/crisis" variant="secondary">
            Crisis resources
          </ButtonLink>
          <form action={psychologistLogoutAction}>
            <button
              type="submit"
              className="text-brand inline-flex min-h-10 items-center px-3 text-sm underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
