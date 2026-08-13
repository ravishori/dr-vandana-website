import { redirect } from "next/navigation";

import { CrisisEditorForm } from "@/app/psychologist/crisis/CrisisEditorForm";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPsychologistSession } from "@/lib/question-portal/auth";

export const dynamic = "force-dynamic";

export default async function NewCrisisResourcePage() {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }
  return (
    <Section className="pt-10">
      <Container className="max-w-3xl">
        <h1>Add crisis resource</h1>
        <div className="mt-8">
          <CrisisEditorForm />
        </div>
      </Container>
    </Section>
  );
}
