import type { ReactNode } from "react";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export function IdentityShell({
  kicker,
  title,
  children,
  wide = false,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Section className="pt-12 md:pt-16">
      <Container className={wide ? "max-w-lg" : "max-w-md"}>
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          {kicker}
        </p>
        <h1 className="mt-4">{title}</h1>
        <div className="mt-6 space-y-5 text-sm leading-relaxed">{children}</div>
      </Container>
    </Section>
  );
}

export const identityButtonClassName =
  "bg-accent text-text hover:bg-accent/90 inline-flex min-h-[var(--touch-target-min)] w-full items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium disabled:opacity-60";
