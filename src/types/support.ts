export type SupportTopic = {
  id: string;
  title: string;
  description: string;
};

export type SupportAreaDetail = {
  id: string;
  heading: string;
  introduction: string;
  topics: readonly SupportTopic[];
  closingNote?: string;
  cta?: {
    label: string;
    href: string;
  };
  icon: "heart" | "awareness" | "family" | "work";
};

export type SupportCtaLink = {
  label: string;
  href: string;
};
