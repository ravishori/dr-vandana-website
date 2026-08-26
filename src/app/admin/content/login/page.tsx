import { redirect } from "next/navigation";

import { ContentAdminLoginForm } from "@/components/cms/ContentAdminLoginForm";
import { getContentAdminSession } from "@/lib/cms/auth";

export default async function ContentAdminLoginPage() {
  const session = await getContentAdminSession();
  if (session) {
    redirect("/admin/content");
  }
  return <ContentAdminLoginForm />;
}
