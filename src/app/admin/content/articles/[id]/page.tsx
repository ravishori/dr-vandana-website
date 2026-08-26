import { notFound } from "next/navigation";

import { ArticleEditorForm } from "@/components/cms/ArticleEditorForm";
import { requireContentAdmin } from "@/lib/cms/require-admin";
import { getAdminArticleById } from "@/lib/cms/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditArticlePage({ params }: PageProps) {
  const session = await requireContentAdmin();
  const { id } = await params;
  const article = await getAdminArticleById(session, id);
  if (!article) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Edit article</h1>
      <ArticleEditorForm article={article} />
    </div>
  );
}
