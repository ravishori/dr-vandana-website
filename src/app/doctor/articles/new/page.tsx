import { redirect } from "next/navigation";

import { ArticleEditorForm } from "@/components/doctor/ArticleEditorForm";
import { requireDoctorSession } from "@/lib/doctor-auth";

export default async function NewArticlePage() {
  try {
    await requireDoctorSession();
  } catch {
    redirect("/doctor/login");
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl">
        New article
      </h1>
      <ArticleEditorForm />
    </div>
  );
}
