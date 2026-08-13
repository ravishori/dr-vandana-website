import { notFound, redirect } from "next/navigation";

import { QuestionReviewForm } from "@/components/question-portal/QuestionReviewForm";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPsychologistSession } from "@/lib/question-portal/auth";
import { getPsychologistQuestion } from "@/lib/question-portal/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ referenceId: string }>;
};

export default async function PsychologistQuestionDetailPage({
  params,
}: PageProps) {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }
  const { referenceId } = await params;
  const loaded = await getPsychologistQuestion(session, referenceId);
  if (!loaded) {
    notFound();
  }

  return (
    <Section className="pt-10">
      <Container className="max-w-3xl">
        <ButtonLink href="/psychologist/questions" variant="ghost" className="px-0">
          Back to questions
        </ButtonLink>
        <h1 className="mt-4">Review {loaded.record.publicReferenceId}</h1>
        <div className="mt-8">
          <QuestionReviewForm record={loaded.record} audit={loaded.audit} />
        </div>
      </Container>
    </Section>
  );
}
