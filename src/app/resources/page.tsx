import type { Metadata } from "next";

import { ResourceCard } from "@/components/cms/ResourceCard";
import { ResourceDisclaimer } from "@/components/cms/ResourceDisclaimer";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/config/site";
import { listPublishedResources } from "@/lib/cms/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Psychology Resources",
  description:
    "Curated psychology and mental-wellness resource links for educational purposes. External sites are not necessarily affiliated with the practice.",
  alternates: { canonical: `${siteConfig.url}/resources` },
  openGraph: {
    title: "Psychology Resources",
    description:
      "Useful mental-wellness information links, shared for educational purposes.",
    url: `${siteConfig.url}/resources`,
  },
};

export default async function ResourcesPage() {
  const result = await listPublishedResources({ pageSize: 50 });
  const featured = result.items.filter((item) => item.featured);
  const rest = result.items.filter((item) => !item.featured);

  return (
    <Section aria-labelledby="resources-heading">
      <Container>
        <header className="max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-brand uppercase">
            Resource hub
          </p>
          <h1
            id="resources-heading"
            className="text-text mt-2 text-4xl font-semibold"
          >
            Psychology &amp; Mental-Wellness Resources
          </h1>
          <p className="text-text-muted mt-4 text-lg leading-relaxed">
            A carefully selected set of external information links. These are
            educational pointers — not emergency services, diagnoses, or
            endorsements.
          </p>
        </header>

        <div className="mt-8">
          <ResourceDisclaimer />
        </div>

        {featured.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-text text-2xl font-semibold">Featured</h2>
            <div className="mt-6 grid gap-10 md:grid-cols-2">
              {featured.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>

        {result.items.length === 0 ? (
          <p className="text-text-muted mt-12">No published resources yet.</p>
        ) : null}
      </Container>
    </Section>
  );
}
