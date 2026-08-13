import { Suspense } from "react";

import { PatientVerifyClient } from "@/components/practice/PatientVerifyClient";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function PatientVerifyPage() {
  return (
    <Section className="pt-12">
      <Container className="max-w-lg">
        <Suspense fallback={<p className="text-text-muted text-sm">Loading…</p>}>
          <PatientVerifyClient />
        </Suspense>
      </Container>
    </Section>
  );
}
