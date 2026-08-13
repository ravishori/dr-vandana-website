import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResourceDetailView } from "@/components/resources/ResourceDetailView";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { professionalProfile } from "@/data/professional";
import {
  getPublishedResourceBySlug,
  listPublishedSlugs,
} from "@/lib/resources/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  try {
    const slugs = await listPublishedSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = await getPublishedResourceBySlug(slug);
  if (!resource) {
    return { title: "Resource" };
  }
  const title = `${resource.title} | ${professionalProfile.name}`;
  return {
    title: { absolute: title },
    description: resource.shortDescription,
    alternates: { canonical: `/resources/${resource.slug}` },
    openGraph: {
      title,
      description: resource.shortDescription,
      url: `/resources/${resource.slug}`,
    },
  };
}

export default async function ResourceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const resource = await getPublishedResourceBySlug(slug);
  if (!resource) {
    notFound();
  }

  const schemaType =
    resource.resourceType === "BOOK"
      ? "Book"
      : resource.resourceType === "RESEARCH_PAPER"
        ? "ScholarlyArticle"
        : resource.resourceType === "ARTICLE"
          ? "Article"
          : "WebPage";

  return (
    <Section className="pt-12 md:pt-16">
      <Container className="max-w-3xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": schemaType,
              name: resource.title,
              description: resource.shortDescription,
              author: resource.author
                ? { "@type": "Person", name: resource.author }
                : undefined,
              url: `https://drvandana.trinetra.net/resources/${resource.slug}`,
            }),
          }}
        />
        <ResourceDetailView resource={resource} />
      </Container>
    </Section>
  );
}
