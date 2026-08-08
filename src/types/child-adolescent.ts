export type ConcernCard = {
  id: string;
  title: string;
  description: string;
  points: readonly string[];
  icon: "academic" | "emotional" | "behavioural" | "peer" | "confidence";
};

export type GuidanceItem = {
  id: string;
  title: string;
  description: string;
};

export type ExpectationItem = {
  id: string;
  title: string;
  description: string;
  icon: "listen" | "person" | "family" | "shield" | "heart";
};

export type PageCtaLink = {
  label: string;
  href: string;
};
