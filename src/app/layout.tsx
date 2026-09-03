import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";

import { SkipToContent } from "@/components/a11y/SkipToContent";
import { SiteShell } from "@/components/layout/SiteShell";
import { themeBootstrapScript } from "@/components/theme/theme-bootstrap";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DEFAULT_THEME_ID } from "@/config/themes";
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
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.professionalName} | ${siteConfig.profession}`,
    description: `${siteConfig.tagline} ${siteConfig.description}`,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.professionalName} — ${siteConfig.profession}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.professionalName} | ${siteConfig.profession}`,
    description: siteConfig.tagline,
    images: ["/og-image.png"],
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

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME_ID}
      className={`${plusJakartaSans.variable} ${playfairDisplay.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-text flex min-h-full flex-col font-sans">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        <ThemeProvider>
          <SkipToContent />
          <SiteShell>{children}</SiteShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
