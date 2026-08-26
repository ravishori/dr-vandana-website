import { saveVideoAction } from "@/app/admin/content/actions";
import {
  CONTENT_STATUSES,
  VIDEO_CATEGORIES,
  type CmsVideo,
} from "@/types/cms";

type Props = { video?: CmsVideo | null };

export function VideoEditorForm({ video }: Props) {
  return (
    <form action={saveVideoAction} className="max-w-2xl space-y-4">
      {video ? <input type="hidden" name="id" value={video.id} /> : null}
      <label className="block text-sm">
        Title
        <input
          name="title"
          required
          defaultValue={video?.title}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Description
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={video?.description}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        YouTube URL
        <input
          name="youtubeUrl"
          type="url"
          required
          defaultValue={video?.youtubeUrl}
          placeholder="https://www.youtube.com/watch?v=..."
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          Category
          <select
            name="category"
            defaultValue={video?.category ?? VIDEO_CATEGORIES[0]}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
          >
            {VIDEO_CATEGORIES.map((category) => (
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
            defaultValue={video?.status ?? "DRAFT"}
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
        Display order
        <input
          name="displayOrder"
          type="number"
          min={0}
          defaultValue={video?.displayOrder ?? 100}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={video?.featured} />
        Featured
      </label>
      <button
        type="submit"
        className="min-h-[var(--touch-target-min)] rounded-[var(--radius-md)] bg-brand px-5 text-sm font-medium text-white"
      >
        Save video
      </button>
    </form>
  );
}
