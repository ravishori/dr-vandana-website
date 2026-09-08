import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArticleEditorForm } from "@/components/doctor/ArticleEditorForm";
import { requireDoctorSession } from "@/lib/doctor-auth";
import { getDoctorArticleById } from "@/lib/articles/service";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditArticlePage({
  params,
  searchParams,
}: PageProps) {
  let session;
  try {
    session = await requireDoctorSession();
  } catch {
    redirect("/doctor/login");
  }

  const { id } = await params;
  const query = await searchParams;
  const article = await getDoctorArticleById(session, id);
  if (!article) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl">
          Edit article
        </h1>
        <Link
          href={`/doctor/articles/${article.id}/preview`}
          className="text-sm text-[var(--color-brand)] hover:underline"
        >
          Preview
        </Link>
      </div>
      {query.saved ? (
        <p className="text-sm text-[var(--color-success)]">Article saved.</p>
      ) : null}
      <p className="text-sm text-[var(--color-text-muted)]">
        Status: {article.status}
      </p>
      <ArticleEditorForm article={article} />
    </div>
  );
}
