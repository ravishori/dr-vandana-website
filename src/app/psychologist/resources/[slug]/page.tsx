import { notFound, redirect } from "next/navigation";

import { ResourceEditorForm } from "@/components/resources/ResourceEditorForm";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPsychologistSession } from "@/lib/question-portal/auth";
import { getAdminResourceBySlug } from "@/lib/resources/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditResourcePage({ params }: PageProps) {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }
  const { slug } = await params;
  const resource = await getAdminResourceBySlug(session, slug);
  if (!resource) {
    notFound();
  }
  return (
    <Section className="pt-10">
      <Container className="max-w-3xl">
        <ButtonLink href="/psychologist/resources" variant="ghost" className="px-0">
          Back to resources
        </ButtonLink>
        <h1 className="mt-4">Edit resource</h1>
        <p className="text-text-muted mt-2 text-sm">
          Public preview: /resources/{resource.slug}
        </p>
        <div className="mt-8">
          <ResourceEditorForm initial={resource} />
        </div>
      </Container>
    </Section>
  );
}
