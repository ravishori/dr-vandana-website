import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function NotFound() {
  return (
    <Section aria-labelledby="not-found-heading">
      <Container className="max-w-2xl py-16">
        <h1
          id="not-found-heading"
          className="font-display text-text text-3xl tracking-tight"
        >
          Page not found
        </h1>
        <p className="text-text-muted mt-4 text-base leading-relaxed">
          The page you requested is not available. Please return to the homepage
          or use the main navigation.
        </p>
        <Link
          href="/"
          className="bg-accent text-text hover:bg-accent/90 mt-8 inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium"
        >
          Go to homepage
        </Link>
      </Container>
    </Section>
  );
}
