import { saveArticleAction } from "@/app/admin/content/actions";
import { cmsAdminEthicsReminder, cmsConfig } from "@/config/cms";
import {
  ARTICLE_CATEGORIES,
  CONTENT_STATUSES,
  type CmsArticle,
} from "@/types/cms";

type FormProps = {
  article?: CmsArticle | null;
};

export function ArticleEditorForm({ article }: FormProps) {
  return (
    <form action={saveArticleAction} className="max-w-3xl space-y-4">
      {article ? <input type="hidden" name="id" value={article.id} /> : null}
      <aside className="rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface-soft p-3 text-sm text-text-muted">
        <p className="font-medium text-text">Before publishing</p>
        <ul className="mt-1 list-disc pl-5">
          {cmsAdminEthicsReminder.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </aside>
      <label className="block text-sm">
        Title
        <input
          name="title"
          required
          defaultValue={article?.title}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Slug
        <input
          name="slug"
          defaultValue={article?.slug}
          placeholder="auto-from-title-if-empty"
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Excerpt
        <textarea
          name="excerpt"
          required
          rows={3}
          defaultValue={article?.excerpt}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Content (Markdown subset)
        <textarea
          name="contentMarkdown"
          required
          rows={14}
          defaultValue={article?.contentMarkdown}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2 font-mono text-sm"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          Category
          <select
            name="category"
            defaultValue={article?.category ?? ARTICLE_CATEGORIES[0]}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
          >
            {ARTICLE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Status
          <select
            name="status"
            defaultValue={article?.status ?? "DRAFT"}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
          >
            {CONTENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        Author
        <input
          name="author"
          required
          defaultValue={article?.author ?? cmsConfig.defaultAuthor}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Tags (comma-separated)
        <input
          name="tags"
          defaultValue={article?.tags.join(", ")}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Featured image URL (https)
        <input
          name="featuredImageUrl"
          defaultValue={article?.featuredImageUrl ?? ""}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Featured image alt
        <input
          name="featuredImageAlt"
          defaultValue={article?.featuredImageAlt ?? ""}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        SEO title
        <input
          name="seoTitle"
          defaultValue={article?.seoTitle ?? ""}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        SEO description
        <textarea
          name="seoDescription"
          rows={2}
          defaultValue={article?.seoDescription ?? ""}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={article?.featured} />
        Featured
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="showEducationalDisclaimer"
          defaultChecked={article?.showEducationalDisclaimer ?? true}
        />
        Show educational disclaimer
      </label>
      <button
        type="submit"
        className="min-h-[var(--touch-target-min)] rounded-[var(--radius-md)] bg-brand px-5 text-sm font-medium text-white"
      >
        Save article
      </button>
    </form>
  );
}
