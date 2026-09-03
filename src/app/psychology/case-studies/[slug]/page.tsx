import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CaseStudyView } from "@/components/case-studies/CaseStudyView";
import { caseStudyRecords } from "@/data/ai/knowledge/case-studies";
import { professionalProfile } from "@/data/professional";

type CaseStudyPageProps = {
  params: Promise<{ slug: string }>;
};

function findStudy(slug: string) {
  return caseStudyRecords.find((study) => study.slug === slug);
}

export function generateStaticParams() {
  return caseStudyRecords.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = findStudy(slug);
  if (!study) {
    return { title: "Case study" };
  }
  const title = `${study.title} | ${professionalProfile.name}`;
  const description = `${study.disclaimer} ${study.generalContext}`;
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `/psychology/case-studies/${study.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/psychology/case-studies/${study.slug}`,
    },
  };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const study = findStudy(slug);
  if (!study) {
    notFound();
  }
  return <CaseStudyView study={study} />;
}
