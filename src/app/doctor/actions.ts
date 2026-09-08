"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  authenticateDoctor,
  clearDoctorSessionCookie,
  requireDoctorSession,
  setDoctorSessionCookie,
} from "@/lib/doctor-auth";
import { getClientIpFromHeaders } from "@/lib/appointment-abuse";
import {
  archiveConversation,
  closeConversation,
  markConversationRead,
  reopenConversation,
  replyToConversation,
  retrySendReply,
} from "@/lib/communications/service";
import {
  deleteArticle,
  setArticleStatus,
  upsertArticle,
} from "@/lib/articles/service";
import { slugify } from "@/lib/articles/slug";
import { ARTICLE_CATEGORIES, ARTICLE_STATUSES } from "@/types/articles";

export type DoctorLoginState = {
  ok: boolean;
  message: string;
};

export async function loginDoctorAction(
  _prev: DoctorLoginState,
  formData: FormData,
): Promise<DoctorLoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fromRaw = String(formData.get("from") ?? "/doctor/dashboard");
  const from = fromRaw.startsWith("/doctor") ? fromRaw : "/doctor/dashboard";

  const ip = getClientIpFromHeaders(await headers());
  const result = await authenticateDoctor(email, password, { ip });

  if (!result.ok) {
    const message =
      result.reason === "RATE_LIMITED"
        ? "Too many attempts. Please wait and try again."
        : result.reason === "RATE_LIMIT_UNAVAILABLE"
          ? "Sign-in is temporarily unavailable. Please try again later."
          : result.reason === "DOCTOR_AUTH_NOT_CONFIGURED"
            ? "Doctor login is not configured."
            : "Invalid email or password.";
    return { ok: false, message };
  }

  await setDoctorSessionCookie(result.token);
  redirect(from);
}

export async function logoutDoctorAction(): Promise<void> {
  await clearDoctorSessionCookie();
  redirect("/doctor/login");
}

export type ArticleEditorState = {
  ok: boolean;
  message: string;
  articleId?: string;
};

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function saveArticleAction(
  _prev: ArticleEditorState,
  formData: FormData,
): Promise<ArticleEditorState> {
  const session = await requireDoctorSession();
  const intent = String(formData.get("intent") ?? "draft");
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const title = String(formData.get("title") ?? "");
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugInput || slugify(title);
  const featuredRaw = String(formData.get("featuredImageUrl") ?? "").trim();
  const category = String(formData.get("category") ?? "General");
  const statusFromIntent =
    intent === "publish"
      ? "PUBLISHED"
      : intent === "unpublish"
        ? "DRAFT"
        : intent === "archive"
          ? "ARCHIVED"
          : String(formData.get("status") ?? "DRAFT");

  if (
    !ARTICLE_CATEGORIES.includes(
      category as (typeof ARTICLE_CATEGORIES)[number],
    )
  ) {
    return { ok: false, message: "Invalid category." };
  }
  if (
    !ARTICLE_STATUSES.includes(
      statusFromIntent as (typeof ARTICLE_STATUSES)[number],
    )
  ) {
    return { ok: false, message: "Invalid status." };
  }

  try {
    const article = await upsertArticle(session, {
      id,
      title,
      slug,
      excerpt: String(formData.get("excerpt") ?? ""),
      content: String(formData.get("content") ?? ""),
      featuredImageUrl: featuredRaw ? featuredRaw : null,
      category: category as (typeof ARTICLE_CATEGORIES)[number],
      tags: parseTags(String(formData.get("tags") ?? "")),
      status: statusFromIntent as (typeof ARTICLE_STATUSES)[number],
      seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
      seoDescription:
        String(formData.get("seoDescription") ?? "").trim() || null,
      showEducationalDisclaimer:
        formData.get("showEducationalDisclaimer") === "on",
    });
    // redirect() throws; keep outside catch-all failure mapping
    redirect(`/doctor/articles/${article.id}/edit?saved=1`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message =
      error instanceof Error && error.message === "DUPLICATE_SLUG"
        ? "That slug is already in use."
        : "Unable to save article. Check required fields.";
    return { ok: false, message };
  }
}

export async function deleteArticleAction(formData: FormData): Promise<void> {
  const session = await requireDoctorSession();
  const id = String(formData.get("id") ?? "");
  await deleteArticle(session, id);
  redirect("/doctor/articles");
}

export async function setArticleStatusAction(
  formData: FormData,
): Promise<void> {
  const session = await requireDoctorSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "DRAFT"
    | "PUBLISHED"
    | "ARCHIVED";
  await setArticleStatus(session, id, status);
  redirect(`/doctor/articles/${id}/edit`);
}

export type CommunicationsActionState = {
  ok: boolean;
  message: string;
};

export async function replyConversationAction(
  _prev: CommunicationsActionState,
  formData: FormData,
): Promise<CommunicationsActionState> {
  const session = await requireDoctorSession();
  const id = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "");
  try {
    const result = await replyToConversation(session, id, body);
    return {
      ok: true,
      message: result.emailOk
        ? "Reply saved and email sent."
        : "Reply saved. Email delivery failed — you can retry.",
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "EMAIL_REPLY_UNAVAILABLE") {
      return {
        ok: false,
        message:
          "Email reply is unavailable for this enquiry because no valid email address was provided. Contact the person by phone or WhatsApp instead.",
      };
    }
    if (code === "INVALID_RECIPIENT") {
      return {
        ok: false,
        message: "Cannot send email: the recipient address is not valid.",
      };
    }
    return { ok: false, message: "Unable to send reply." };
  }
}

export async function retryReplyAction(formData: FormData): Promise<void> {
  const session = await requireDoctorSession();
  const conversationId = String(formData.get("conversationId") ?? "");
  const messageId = String(formData.get("messageId") ?? "");
  await retrySendReply(session, conversationId, messageId);
  redirect(`/doctor/communications/${conversationId}`);
}

export async function markReadAction(formData: FormData): Promise<void> {
  const session = await requireDoctorSession();
  const id = String(formData.get("conversationId") ?? "");
  await markConversationRead(session, id);
  redirect(`/doctor/communications/${id}`);
}

export async function closeConversationAction(
  formData: FormData,
): Promise<void> {
  const session = await requireDoctorSession();
  const id = String(formData.get("conversationId") ?? "");
  await closeConversation(session, id);
  redirect(`/doctor/communications/${id}`);
}

export async function archiveConversationAction(
  formData: FormData,
): Promise<void> {
  const session = await requireDoctorSession();
  const id = String(formData.get("conversationId") ?? "");
  await archiveConversation(session, id);
  redirect(`/doctor/communications/${id}`);
}

export async function reopenConversationAction(
  formData: FormData,
): Promise<void> {
  const session = await requireDoctorSession();
  const id = String(formData.get("conversationId") ?? "");
  await reopenConversation(session, id);
  redirect(`/doctor/communications/${id}`);
}
