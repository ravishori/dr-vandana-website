import Link from "next/link";
import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { resourceTypeLabels } from "@/data/resources/seed";
import { getPsychologistSession } from "@/lib/question-portal/auth";
import {
  getResourceStats,
  listAdminResources,
} from "@/lib/resources/service";

export const dynamic = "force-dynamic";

export default async function PsychologistResourcesPage() {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }

  const [stats, listed] = await Promise.all([
    getResourceStats(session),
    listAdminResources(session, { page: 1, pageSize: 100 }),
  ]);

  const summary = [
    { label: "Published", value: stats.published },
    { label: "Drafts", value: stats.drafts },
    { label: "Featured", value: stats.featured },
    { label: "Books", value: stats.books },
    { label: "Research", value: stats.research },
    { label: "Articles / guides", value: stats.articles },
    { label: "Needs verification", value: stats.needsVerification },
  ];

  return (
    <Section className="pt-10">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1>Resource library</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed">
              Manage curated educational resources. Only published items appear
              on the public library. Do not add unverified retailer URLs.
            </p>
          </div>
          <ButtonLink href="/psychologist/resources/new">Add resource</ButtonLink>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((item) => (
            <li
              key={item.label}
              className="border-brand-muted/30 bg-surface rounded-[var(--radius-lg)] border p-4"
            >
              <p className="text-text-muted text-sm">{item.label}</p>
              <p className="text-brand mt-2 font-serif text-3xl">{item.value}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="text-text-muted border-b">
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Verified</th>
                <th className="py-2 font-medium">Edit</th>
              </tr>
            </thead>
            <tbody>
              {listed.items.map((item) => (
                <tr key={item.id} className="border-b border-brand-muted/20">
                  <td className="py-3 pr-3">{item.title}</td>
                  <td className="py-3 pr-3">
                    {resourceTypeLabels[item.resourceType]}
                  </td>
                  <td className="py-3 pr-3">{item.status}</td>
                  <td className="py-3 pr-3">
                    {item.isVerified ? "Yes" : "No"}
                  </td>
                  <td className="py-3">
                    <Link href={`/psychologist/resources/${item.slug}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  );
}
