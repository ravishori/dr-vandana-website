import type { Metadata } from "next";
import { Suspense } from "react";

import { ResourceDisclaimer } from "@/components/resources/ResourceDisclaimer";
import { ResourceLibraryClient } from "@/components/resources/ResourceLibraryClient";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { professionalProfile } from "@/data/professional";
import { listPublishedResources } from "@/lib/resources/service";
import type {
  DifficultyLevel,
  EvidenceLevel,
  ResourceAudience,
  ResourceFormat,
  ResourceTopic,
  ResourceType,
} from "@/types/resources";

export const dynamic = "force-dynamic";

const title = `Mental Wellness Resources | ${professionalProfile.name}`;
const description =
  "Explore trusted psychology books, research, journals, articles and mental wellness resources curated for education and emotional well-being.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/resources" },
  openGraph: {
    title,
    description,
    url: "/resources",
  },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function ResourcesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(readParam(params.page) ?? "1", 10) || 1;
  const result = await listPublishedResources({
    q: readParam(params.q),
    resourceType: readParam(params.type) as ResourceType | undefined,
    topic: readParam(params.topic) as ResourceTopic | undefined,
    audience: readParam(params.audience) as ResourceAudience | undefined,
    format: readParam(params.format) as ResourceFormat | undefined,
    difficultyLevel: readParam(params.level) as DifficultyLevel | undefined,
    evidenceLevel: readParam(params.evidence) as EvidenceLevel | undefined,
    page,
    pageSize: 12,
  });

  return (
    <>
      <Section className="border-b border-brand-muted/20 pt-12 md:pt-16">
        <Container className="max-w-3xl">
          <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
            Educational library
          </p>
          <h1 className="mt-4">Mental Wellness Resource Library</h1>
          <p className="mt-5 text-base leading-relaxed md:text-lg">
            Trusted books, research, articles and educational resources to
            support your journey toward better mental well-being.
          </p>
          <p className="text-brand-muted mt-4 font-serif text-xl">
            Your Mental Well-being Matters.
          </p>
          <div className="mt-8">
            <ResourceDisclaimer />
          </div>
        </Container>
      </Section>
      <Section>
        <Container>
          <Suspense fallback={<p className="text-sm">Loading resources…</p>}>
            <ResourceLibraryClient
              initialItems={result.items}
              total={result.total}
              page={result.page}
              pageSize={result.pageSize}
            />
          </Suspense>
        </Container>
      </Section>
    </>
  );
}
