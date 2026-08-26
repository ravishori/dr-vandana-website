import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * Parent layout for all /admin routes.
 * noindex is SEO guidance only — authentication still protects admin surfaces.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
