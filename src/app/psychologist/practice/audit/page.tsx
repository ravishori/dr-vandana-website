import { redirect } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";

export default async function PracticeAuditPage() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PSYCHOLOGIST") {
    redirect("/patient/login");
  }
  const audits = await (await getPracticeRepository()).listAudits(100);

  return (
    <Section className="pt-10">
      <Container>
        <h1>Audit log</h1>
        <p className="text-text-muted mt-2 text-sm">
          Sensitive content is not stored in audit metadata.
        </p>
        <ul className="mt-8 space-y-2 text-sm">
          {audits.map((event) => (
            <li key={event.id} className="border-b border-brand-muted/20 py-2">
              {event.createdAt} · {event.action} · {event.targetType} ·{" "}
              {event.result}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
