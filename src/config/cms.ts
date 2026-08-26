import { professionalProfile } from "@/data/professional";

/**
 * Content CMS configuration.
 * Admin credentials come from environment — never hardcode passwords.
 */
export const cmsConfig = {
  cookieName: "drv_content_admin_session",
  sessionTtlSeconds: 60 * 60 * 8,
  defaultAuthor: professionalProfile.name,
  storeEnvKey: "CMS_STORE",
  filePathEnvKey: "CMS_DATABASE_PATH",
  defaultFilePath: "data/cms/content-store.json",
  adminEmailEnvKey: "CONTENT_ADMIN_EMAIL",
  adminPasswordHashEnvKey: "CONTENT_ADMIN_PASSWORD_HASH",
  /** Dev-only plaintext password — rejected in production. */
  adminPasswordDevEnvKey: "CONTENT_ADMIN_PASSWORD",
  sessionSecretEnvKey: "CONTENT_ADMIN_SESSION_SECRET",
} as const;

export const cmsAdminEthicsReminder = [
  "Do not diagnose readers through articles.",
  "Do not promise guaranteed recovery or treatment outcomes.",
  "Do not claim that one technique works for everyone.",
  "Avoid stigmatizing language.",
  "Encourage professional evaluation when appropriate.",
  "Clearly distinguish educational information from professional assessment.",
] as const;

export const educationalArticleDisclaimer =
  "Disclaimer: This article is for educational purposes and should not be considered a substitute for professional psychological assessment or care.";

export const resourceLibraryDisclaimer =
  "External resources are provided for informational purposes. Dr. Vandana Rajiv Chaudhary does not necessarily endorse or control the content of third-party websites.";
