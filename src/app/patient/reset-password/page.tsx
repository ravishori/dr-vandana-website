import { Suspense } from "react";

import { ResetPasswordClient } from "@/components/practice/ResetPasswordClient";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function ResetPasswordPage() {
  return (
    <Section className="pt-12">
      <Container className="max-w-lg">
        <Suspense fallback={<p className="text-text-muted text-sm">Loading…</p>}>
          <ResetPasswordClient />
        </Suspense>
      </Container>
    </Section>
  );
}
