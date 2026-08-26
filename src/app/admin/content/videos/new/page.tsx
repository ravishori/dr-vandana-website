import { VideoEditorForm } from "@/components/cms/VideoEditorForm";
import { requireContentAdmin } from "@/lib/cms/require-admin";

export default async function NewVideoPage() {
  await requireContentAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Add YouTube video</h1>
      <VideoEditorForm />
    </div>
  );
}
