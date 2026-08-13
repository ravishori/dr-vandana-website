import Link from "next/link";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function PatientPortalIndex() {
  return (
    <Section className="pt-12">
      <Container className="max-w-2xl">
        <h1>Patient portal</h1>
        <p className="mt-4 text-base leading-relaxed">
          Create a secure account to request counselling appointments and view
          your own appointment updates. This portal is not an emergency service.
        </p>
        <p className="text-brand-muted mt-3 font-serif text-xl">
          Your Mental Well-being Matters.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/patient/register">Create account</ButtonLink>
          <ButtonLink href="/patient/login" variant="secondary">
            Sign in
          </ButtonLink>
          <Link href="/mental-health-support" className="text-brand text-sm">
            Need immediate help?
          </Link>
        </div>
      </Container>
    </Section>
  );
}
