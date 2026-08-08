export type AboutValue = {
  id: string;
  title: string;
  description: string;
  icon: "empathy" | "respect" | "confidentiality" | "evidence";
};

export type AboutApproachTheme = {
  id: string;
  title: string;
  description: string;
};

export type AboutCtaLink = {
  label: string;
  href: string;
};
