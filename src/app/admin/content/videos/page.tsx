import Link from "next/link";

import {
  deleteVideoAction,
  videoStatusAction,
} from "@/app/admin/content/actions";
import { requireContentAdmin } from "@/lib/cms/require-admin";
import { listAdminVideos } from "@/lib/cms/service";

export default async function AdminVideosPage() {
  const session = await requireContentAdmin();
  const result = await listAdminVideos(session, { pageSize: 100 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Videos</h1>
        <Link
          href="/admin/content/videos/new"
          className="rounded-[var(--radius-md)] bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          Add video
        </Link>
      </div>
      <ul className="space-y-4">
        {result.items.map((video) => (
          <li
            key={video.id}
            className="flex flex-wrap items-start justify-between gap-3 border-t border-brand-muted/30 pt-4"
          >
            <div>
              <Link
                href={`/admin/content/videos/${video.id}`}
                className="font-medium hover:underline"
              >
                {video.title}
              </Link>
              <p className="text-text-muted text-sm">
                {video.status} · {video.youtubeVideoId}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {video.status !== "PUBLISHED" ? (
                <form action={videoStatusAction}>
                  <input type="hidden" name="id" value={video.id} />
                  <input type="hidden" name="status" value="PUBLISHED" />
                  <button type="submit" className="underline">
                    Publish
                  </button>
                </form>
              ) : (
                <form action={videoStatusAction}>
                  <input type="hidden" name="id" value={video.id} />
                  <input type="hidden" name="status" value="DRAFT" />
                  <button type="submit" className="underline">
                    Unpublish
                  </button>
                </form>
              )}
              <form action={videoStatusAction}>
                <input type="hidden" name="id" value={video.id} />
                <input type="hidden" name="status" value="ARCHIVED" />
                <button type="submit" className="underline">
                  Archive
                </button>
              </form>
              <form action={deleteVideoAction}>
                <input type="hidden" name="id" value={video.id} />
                <button type="submit" className="text-red-700 underline">
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
