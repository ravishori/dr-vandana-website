import { redirect } from "next/navigation";

import { ResourceEditorForm } from "@/components/resources/ResourceEditorForm";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPsychologistSession } from "@/lib/question-portal/auth";

export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }
  return (
    <Section className="pt-10">
      <Container className="max-w-3xl">
        <h1>Add resource</h1>
        <div className="mt-8">
          <ResourceEditorForm />
        </div>
      </Container>
    </Section>
  );
}
