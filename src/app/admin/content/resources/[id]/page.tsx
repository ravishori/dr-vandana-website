import { notFound } from "next/navigation";

import { ResourceEditorForm } from "@/components/cms/ResourceEditorForm";
import { requireContentAdmin } from "@/lib/cms/require-admin";
import { getAdminResourceById } from "@/lib/cms/service";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditResourcePage({ params }: PageProps) {
  const session = await requireContentAdmin();
  const { id } = await params;
  const resource = await getAdminResourceById(session, id);
  if (!resource) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Edit resource</h1>
      <ResourceEditorForm resource={resource} />
    </div>
  );
}
