import { educationalArticleDisclaimer } from "@/config/cms";

type Props = {
  show?: boolean;
};

export function ArticleDisclaimer({ show = true }: Props) {
  if (!show) {
    return null;
  }
  return (
    <aside
      className="mt-10 rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface-soft px-4 py-3 text-sm text-text-muted"
      role="note"
    >
      {educationalArticleDisclaimer}
    </aside>
  );
}
