import { ArticleEditorForm } from "@/components/cms/ArticleEditorForm";
import { requireContentAdmin } from "@/lib/cms/require-admin";

export default async function NewArticlePage() {
  await requireContentAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">New article</h1>
      <ArticleEditorForm />
    </div>
  );
}
