import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { educationalArticleDisclaimer } from "@/config/doctor-portal";
import { requireDoctorSession } from "@/lib/doctor-auth";
import { getDoctorArticleById } from "@/lib/articles/service";
import { renderSafeMarkdown } from "@/lib/articles/markdown";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArticlePreviewPage({ params }: PageProps) {
  let session;
  try {
    session = await requireDoctorSession();
  } catch {
    redirect("/doctor/login");
  }

  const { id } = await params;
  const article = await getDoctorArticleById(session, id);
  if (!article) {
    notFound();
  }

  const html = renderSafeMarkdown(article.content);

  return (
    <article className="space-y-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        Doctor preview · status {article.status} ·{" "}
        <Link
          href={`/doctor/articles/${article.id}/edit`}
          className="text-[var(--color-brand)] hover:underline"
        >
          Edit
        </Link>
      </p>
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl">
        {article.title}
      </h1>
      <p className="text-[var(--color-text-muted)]">{article.excerpt}</p>
      <div
        className="prose-wellness max-w-none space-y-3 text-[var(--color-text)] [&_a]:text-[var(--color-brand)] [&_h2]:font-[family-name:var(--font-playfair)] [&_h2]:text-2xl [&_h3]:text-xl [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {article.showEducationalDisclaimer ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-4 text-sm text-[var(--color-text-muted)]">
          {educationalArticleDisclaimer}
        </p>
      ) : null}
    </article>
  );
}
