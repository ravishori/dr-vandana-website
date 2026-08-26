import { redirect } from "next/navigation";

import { getContentAdminSession } from "@/lib/cms/auth";
import type { ContentAdminSession } from "@/types/cms";

export async function requireContentAdmin(): Promise<ContentAdminSession> {
  const session = await getContentAdminSession();
  if (!session) {
    redirect("/admin/content/login");
  }
  return session;
}
