import Link from "next/link";

import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  LOGIN_SECURITY_NOTICE,
  parseLoginIntent,
  type LoginIntent,
} from "@/lib/auth/role-intent";

const INTENT_COPY: Record<
  LoginIntent,
  { title: string; description: string }
> = {
  psychologist: {
    title: "Psychologist sign-in",
    description:
      "Professional dashboard access will be available here once secure accounts are enabled for verified psychologists.",
  },
  client: {
    title: "Client / Patient sign-in",
    description:
      "Appointment and wellness access will be available here once secure client accounts are enabled.",
  },
};

type LoginSignInPanelProps = {
  intentParam: string | string[] | undefined;
};

export function LoginSignInPanel({ intentParam }: LoginSignInPanelProps) {
  const raw = Array.isArray(intentParam) ? intentParam[0] : intentParam;
  const intent = parseLoginIntent(raw ?? null);

  if (!intent) {
    return (
      <div className="mx-auto w-full max-w-lg text-center">
        <h1 className="text-[clamp(1.75rem,4vw,2.35rem)]">Choose how to continue</h1>
        <p className="text-text-muted mt-4 text-base leading-relaxed">
          Please return to the login page and select Psychologist or Client /
          Patient. Selecting a role does not grant access by itself.
        </p>
        <div className="mt-8">
          <ButtonLink href="/login">Back to Login</ButtonLink>
        </div>
      </div>
    );
  }

  const copy = INTENT_COPY[intent];

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="text-center">
        <p className="text-text-muted text-sm font-medium tracking-[0.16em] uppercase">
          Secure sign-in
        </p>
        <h1 className="mt-3 text-[clamp(1.75rem,4vw,2.35rem)]">{copy.title}</h1>
        <p className="text-text-muted mt-4 text-base leading-relaxed">
          {copy.description}
        </p>
      </div>

      <div className="border-brand-muted/30 bg-surface mt-8 rounded-[var(--radius-xl)] border p-5 md:p-6">
        <p className="text-text text-sm leading-relaxed md:text-base">
          Account sign-in is not active on this website yet. No password form is
          accepted here, and the role you selected cannot unlock psychologist or
          client features.
        </p>
        <p className="text-text-muted mt-4 text-sm leading-relaxed">
          {LOGIN_SECURITY_NOTICE}
        </p>
        <ul className="text-text-muted mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            Authorization will rely on verified session or database roles only.
          </li>
          <li>
            Client accounts will never gain psychologist access by changing a
            URL or form field.
          </li>
          <li>
            Until accounts launch, please book an appointment or contact the
            practice directly.
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/book-appointment">Book an Appointment</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Contact
        </ButtonLink>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-brand no-underline hover:underline">
          Choose a different option
        </Link>
      </p>
    </div>
  );
}
