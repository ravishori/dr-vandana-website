import { notFound, redirect } from "next/navigation";

import { CrisisEditorForm } from "@/app/psychologist/crisis/CrisisEditorForm";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPsychologistSession } from "@/lib/question-portal/auth";
import {
  getAdminCrisisResource,
  listCrisisVerifications,
} from "@/lib/crisis/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditCrisisResourcePage({ params }: PageProps) {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }
  const { slug } = await params;
  const resource = await getAdminCrisisResource(session, slug);
  if (!resource) {
    notFound();
  }
  const history = await listCrisisVerifications(session, resource.id);

  return (
    <Section className="pt-10">
      <Container className="max-w-3xl">
        <ButtonLink href="/psychologist/crisis" variant="ghost" className="px-0">
          Back to crisis resources
        </ButtonLink>
        <h1 className="mt-4">Edit crisis resource</h1>
        <p className="text-text-muted mt-2 text-sm">
          Public page shows this only when VERIFIED and active.
        </p>
        <div className="mt-8">
          <CrisisEditorForm initial={resource} />
        </div>
        <section className="mt-12 space-y-3">
          <h2 className="text-lg">Verification history</h2>
          {history.length === 0 ? (
            <p className="text-text-muted text-sm">No audit entries yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="border-brand-muted/30 rounded-[var(--radius-md)] border p-3"
                >
                  <p>
                    {entry.previousStatus ?? "—"} → {entry.newStatus}
                  </p>
                  <p className="text-text-muted mt-1">
                    {entry.verifiedAt} · {entry.verifiedBy}
                  </p>
                  <p className="mt-2">{entry.notes}</p>
                  <p className="text-text-muted mt-1 break-all">
                    {entry.sourceUrl}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </Section>
  );
}
