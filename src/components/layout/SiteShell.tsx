import type { ReactNode } from "react";

import { AdaptiveExperience } from "@/components/adaptive/AdaptiveExperience";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileQuickBar } from "@/components/layout/MobileQuickBar";
import { Navbar } from "@/components/navigation/Navbar";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <AdaptiveExperience />
      <Navbar />
      <main
        id="main-content"
        className="flex flex-1 flex-col pb-[calc(var(--mobile-quick-bar-offset)+env(safe-area-inset-bottom))] lg:pb-0"
      >
        {children}
      </main>
      <SiteFooter />
      <MobileQuickBar />
    </>
  );
}
