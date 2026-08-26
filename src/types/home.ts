export type HomeHighlight = {
  id: string;
  value: string;
  label: string;
};

export type SupportArea = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: "heart" | "awareness" | "family" | "work";
};

export type ExpectationItem = {
  id: string;
  title: string;
  description: string;
  icon: "listen" | "shield" | "person" | "book";
};

export type HomeCtaLink = {
  label: string;
  href: string;
};
