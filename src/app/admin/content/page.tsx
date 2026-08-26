import Link from "next/link";
import { redirect } from "next/navigation";

import { cmsAdminEthicsReminder } from "@/config/cms";
import { getContentAdminSession } from "@/lib/cms/auth";
import { getContentDashboardStats } from "@/lib/cms/service";

export default async function ContentAdminDashboardPage() {
  const session = await getContentAdminSession();
  if (!session) {
    redirect("/admin/content/login");
  }
  const stats = await getContentDashboardStats(session);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Content Management</h1>
        <p className="text-text-muted mt-2 max-w-2xl text-sm">
          Create and publish educational content. Clinical and legal accuracy
          remain your responsibility.
        </p>
      </header>

      <aside className="rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface-soft p-4 text-sm text-text-muted">
        <p className="font-medium text-text">Ethics reminder</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {cmsAdminEthicsReminder.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </aside>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="rounded-[var(--radius-md)] border border-brand-muted/30 bg-surface p-5">
          <h2 className="text-lg font-semibold">Blogs &amp; Articles</h2>
          <p className="text-text-muted mt-2 text-sm">
            {stats.articles.published} Published | {stats.articles.draft} Drafts
          </p>
          <Link
            href="/admin/content/articles/new"
            className="mt-4 inline-block text-sm font-medium text-brand underline underline-offset-2"
          >
            New Article
          </Link>
        </section>
        <section className="rounded-[var(--radius-md)] border border-brand-muted/30 bg-surface p-5">
          <h2 className="text-lg font-semibold">Psychology Resources</h2>
          <p className="text-text-muted mt-2 text-sm">
            {stats.resources.published} Published
          </p>
          <Link
            href="/admin/content/resources/new"
            className="mt-4 inline-block text-sm font-medium text-brand underline underline-offset-2"
          >
            Add Resource
          </Link>
        </section>
        <section className="rounded-[var(--radius-md)] border border-brand-muted/30 bg-surface p-5">
          <h2 className="text-lg font-semibold">YouTube Videos</h2>
          <p className="text-text-muted mt-2 text-sm">
            {stats.videos.published} Published
          </p>
          <Link
            href="/admin/content/videos/new"
            className="mt-4 inline-block text-sm font-medium text-brand underline underline-offset-2"
          >
            Add YouTube Video
          </Link>
        </section>
      </div>
    </div>
  );
}
