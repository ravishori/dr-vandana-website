import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

import { SkipToContent } from "@/components/a11y/SkipToContent";
import { siteConfig } from "@/config/site";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.professionalName} | ${siteConfig.profession}`,
    template: `%s | ${siteConfig.professionalName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.professionalName }],
  creator: siteConfig.professionalName,
  keywords: [
    "Psychologist",
    "Dr. Vandana Rajiv Chaudhary",
    "psychological counselling",
    "emotional wellness",
    "mental well-being",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.professionalName} | ${siteConfig.profession}`,
    description: `${siteConfig.tagline} ${siteConfig.description}`,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.professionalName} | ${siteConfig.profession}`,
    description: siteConfig.tagline,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="bg-background text-text flex min-h-full flex-col font-sans">
        <SkipToContent />
        {children}
      </body>
    </html>
  );
}
