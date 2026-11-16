import { professionalProfile } from "@/data/professional";

export const articlesConfig = {
  basePath: "/articles",
  defaultAuthorName: professionalProfile.name,
  listPageSize: 9,
} as const;

export const educationalArticleDisclaimer =
  "This article is for educational purposes only and is not a substitute for professional psychological assessment, diagnosis, or care. It is not emergency advice and does not create a therapist–client relationship.";
