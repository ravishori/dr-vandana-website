import { notFound } from "next/navigation";

import { VideoEditorForm } from "@/components/cms/VideoEditorForm";
import { requireContentAdmin } from "@/lib/cms/require-admin";
import { getAdminVideoById } from "@/lib/cms/service";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditVideoPage({ params }: PageProps) {
  const session = await requireContentAdmin();
  const { id } = await params;
  const video = await getAdminVideoById(session, id);
  if (!video) {
    notFound();
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Edit video</h1>
      <VideoEditorForm video={video} />
    </div>
  );
}
