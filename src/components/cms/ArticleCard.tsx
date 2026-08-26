import Link from "next/link";

import { ButtonLink } from "@/components/ui/ButtonLink";
import type { CmsArticle } from "@/types/cms";
import { cn } from "@/lib/utils";

type ArticleCardProps = {
  article: CmsArticle;
  featured?: boolean;
};

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col gap-3 border-t border-brand-muted/30 pt-5",
        featured && "border-t-2 border-brand pt-6",
      )}
    >
      <p className="text-xs font-medium tracking-wide text-brand uppercase">
        {article.category}
      </p>
      <h3 className={cn("text-text font-semibold", featured ? "text-2xl" : "text-xl")}>
        <Link
          href={`/blog/${article.slug}`}
          className="text-inherit no-underline hover:underline"
        >
          {article.title}
        </Link>
      </h3>
      <p className="text-text-muted text-sm leading-relaxed">{article.excerpt}</p>
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-2 text-xs text-text-muted">
        <span>{article.author}</span>
        {article.publishedAt ? (
          <time dateTime={article.publishedAt}>
            {new Date(article.publishedAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
        ) : null}
      </div>
      <div>
        <ButtonLink href={`/blog/${article.slug}`} variant="ghost">
          Read article
        </ButtonLink>
      </div>
    </article>
  );
}
