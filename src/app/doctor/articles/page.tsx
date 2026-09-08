import Link from "next/link";
import { redirect } from "next/navigation";

import { requireDoctorSession } from "@/lib/doctor-auth";
import { listDoctorArticles } from "@/lib/articles/service";
import type { ArticleStatus } from "@/types/articles";

type PageProps = {
  searchParams: Promise<{ status?: string; q?: string }>;
};

export default async function DoctorArticlesPage({ searchParams }: PageProps) {
  let session;
  try {
    session = await requireDoctorSession();
  } catch {
    redirect("/doctor/login");
  }

  const params = await searchParams;
  const status =
    params.status === "DRAFT" ||
    params.status === "PUBLISHED" ||
    params.status === "ARCHIVED"
      ? (params.status as ArticleStatus)
      : undefined;

  const result = await listDoctorArticles(session, {
    status,
    search: params.q,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl">
            Articles
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Educational content only — not clinical documentation.
          </p>
        </div>
        <Link
          href="/doctor/articles/new"
          className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
        >
          New article
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search…"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button
          type="submit"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((article) => (
              <tr
                key={article.id}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <td className="px-4 py-3">{article.title}</td>
                <td className="px-4 py-3">{article.status}</td>
                <td className="px-4 py-3">{article.category}</td>
                <td className="px-4 py-3">
                  {new Date(article.updatedAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <Link
                      href={`/doctor/articles/${article.id}/edit`}
                      className="text-[var(--color-brand)] hover:underline"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/doctor/articles/${article.id}/preview`}
                      className="text-[var(--color-brand)] hover:underline"
                    >
                      Preview
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                >
                  No articles found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
