import { ResourceEditorForm } from "@/components/cms/ResourceEditorForm";
import { requireContentAdmin } from "@/lib/cms/require-admin";

export default async function NewResourcePage() {
  await requireContentAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Add resource</h1>
      <ResourceEditorForm />
    </div>
  );
}
