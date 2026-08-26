import { saveResourceAction } from "@/app/admin/content/actions";
import {
  CONTENT_STATUSES,
  RESOURCE_TYPES,
  type CmsResource,
} from "@/types/cms";

type Props = { resource?: CmsResource | null };

export function ResourceEditorForm({ resource }: Props) {
  return (
    <form action={saveResourceAction} className="max-w-2xl space-y-4">
      {resource ? <input type="hidden" name="id" value={resource.id} /> : null}
      <label className="block text-sm">
        Title
        <input
          name="title"
          required
          defaultValue={resource?.title}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Description
        <textarea
          name="description"
          required
          rows={4}
          defaultValue={resource?.description}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        URL (https only)
        <input
          name="url"
          type="url"
          required
          defaultValue={resource?.url}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Category
        <input
          name="category"
          required
          defaultValue={resource?.category ?? "Mental Health Information"}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Organization name
        <input
          name="organizationName"
          defaultValue={resource?.organizationName ?? ""}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          Resource type
          <select
            name="resourceType"
            defaultValue={resource?.resourceType ?? RESOURCE_TYPES[0]}
            className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Status
          <select
            name="status"
            defaultValue={resource?.status ?? "DRAFT"}
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
          defaultValue={resource?.displayOrder ?? 100}
          className="mt-1 w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={resource?.featured} />
        Featured
      </label>
      <button
        type="submit"
        className="min-h-[var(--touch-target-min)] rounded-[var(--radius-md)] bg-brand px-5 text-sm font-medium text-white"
      >
        Save resource
      </button>
    </form>
  );
}
