import Link from "next/link";

import {
  articleStatusAction,
  deleteArticleAction,
} from "@/app/admin/content/actions";
import { requireContentAdmin } from "@/lib/cms/require-admin";
import { listAdminArticles } from "@/lib/cms/service";

export default async function AdminArticlesPage() {
  const session = await requireContentAdmin();
  const result = await listAdminArticles(session, { pageSize: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Articles</h1>
        <Link
          href="/admin/content/articles/new"
          className="rounded-[var(--radius-md)] bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          New article
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr className="border-b border-brand-muted/40 text-text-muted">
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((article) => (
              <tr key={article.id} className="border-b border-brand-muted/20">
                <td className="py-3 pr-3">
                  <Link
                    href={`/admin/content/articles/${article.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {article.title}
                  </Link>
                </td>
                <td className="py-3 pr-3">{article.status}</td>
                <td className="py-3 pr-3">{article.category}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    {article.status !== "PUBLISHED" ? (
                      <form action={articleStatusAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <input type="hidden" name="status" value="PUBLISHED" />
                        <button type="submit" className="underline">
                          Publish
                        </button>
                      </form>
                    ) : (
                      <form action={articleStatusAction}>
                        <input type="hidden" name="id" value={article.id} />
                        <input type="hidden" name="status" value="DRAFT" />
                        <button type="submit" className="underline">
                          Unpublish
                        </button>
                      </form>
                    )}
                    <form action={articleStatusAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <input type="hidden" name="status" value="ARCHIVED" />
                      <button type="submit" className="underline">
                        Archive
                      </button>
                    </form>
                    <form action={deleteArticleAction}>
                      <input type="hidden" name="id" value={article.id} />
                      <button type="submit" className="text-red-700 underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
