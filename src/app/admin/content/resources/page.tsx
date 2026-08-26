import Link from "next/link";

import {
  deleteResourceAction,
  resourceStatusAction,
} from "@/app/admin/content/actions";
import { requireContentAdmin } from "@/lib/cms/require-admin";
import { listAdminResources } from "@/lib/cms/service";

export default async function AdminResourcesPage() {
  const session = await requireContentAdmin();
  const result = await listAdminResources(session, { pageSize: 100 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Resources</h1>
        <Link
          href="/admin/content/resources/new"
          className="rounded-[var(--radius-md)] bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          Add resource
        </Link>
      </div>
      <ul className="space-y-4">
        {result.items.map((resource) => (
          <li
            key={resource.id}
            className="flex flex-wrap items-start justify-between gap-3 border-t border-brand-muted/30 pt-4"
          >
            <div>
              <Link
                href={`/admin/content/resources/${resource.id}`}
                className="font-medium hover:underline"
              >
                {resource.title}
              </Link>
              <p className="text-text-muted text-sm">
                {resource.status} · {resource.resourceType}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {resource.status !== "PUBLISHED" ? (
                <form action={resourceStatusAction}>
                  <input type="hidden" name="id" value={resource.id} />
                  <input type="hidden" name="status" value="PUBLISHED" />
                  <button type="submit" className="underline">
                    Publish
                  </button>
                </form>
              ) : (
                <form action={resourceStatusAction}>
                  <input type="hidden" name="id" value={resource.id} />
                  <input type="hidden" name="status" value="DRAFT" />
                  <button type="submit" className="underline">
                    Unpublish
                  </button>
                </form>
              )}
              <form action={resourceStatusAction}>
                <input type="hidden" name="id" value={resource.id} />
                <input type="hidden" name="status" value="ARCHIVED" />
                <button type="submit" className="underline">
                  Archive
                </button>
              </form>
              <form action={deleteResourceAction}>
                <input type="hidden" name="id" value={resource.id} />
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
