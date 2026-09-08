"use client";

import { useActionState } from "react";

import {
  deleteArticleAction,
  saveArticleAction,
  type ArticleEditorState,
} from "@/app/doctor/actions";
import { ARTICLE_CATEGORIES, type Article } from "@/types/articles";

const initial: ArticleEditorState = { ok: false, message: "" };

export function ArticleEditorForm({ article }: { article?: Article }) {
  const [state, formAction, pending] = useActionState(
    saveArticleAction,
    initial,
  );

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        {article ? <input type="hidden" name="id" value={article.id} /> : null}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Title</span>
          <input
            name="title"
            required
            defaultValue={article?.title ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Slug</span>
          <input
            name="slug"
            defaultValue={article?.slug ?? ""}
            placeholder="auto-from-title"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Excerpt</span>
          <textarea
            name="excerpt"
            required
            rows={3}
            defaultValue={article?.excerpt ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Content (Markdown)</span>
          <textarea
            name="content"
            required
            rows={16}
            defaultValue={article?.content ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-sm"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Category</span>
            <select
              name="category"
              defaultValue={article?.category ?? "General"}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            >
              {ARTICLE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Tags (comma-separated)</span>
            <input
              name="tags"
              defaultValue={article?.tags.join(", ") ?? ""}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Featured image URL (https)</span>
          <input
            name="featuredImageUrl"
            type="url"
            defaultValue={article?.featuredImageUrl ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">SEO title</span>
          <input
            name="seoTitle"
            defaultValue={article?.seoTitle ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">SEO description</span>
          <textarea
            name="seoDescription"
            rows={2}
            defaultValue={article?.seoDescription ?? ""}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="showEducationalDisclaimer"
            defaultChecked={article?.showEducationalDisclaimer ?? true}
          />
          Show educational disclaimer
        </label>

        {state.message ? (
          <p role="alert" className="text-sm text-[var(--color-emergency)]">
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={pending}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={pending}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
          >
            Publish
          </button>
          <button
            type="submit"
            name="intent"
            value="unpublish"
            disabled={pending}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-50"
          >
            Unpublish
          </button>
          <button
            type="submit"
            name="intent"
            value="archive"
            disabled={pending}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm disabled:opacity-50"
          >
            Archive
          </button>
        </div>
      </form>

      {article ? (
        <form action={deleteArticleAction}>
          <input type="hidden" name="id" value={article.id} />
          <button
            type="submit"
            className="text-sm text-[var(--color-emergency)] hover:underline"
          >
            Delete article
          </button>
        </form>
      ) : null}
    </div>
  );
}
