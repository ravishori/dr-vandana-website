import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileQuickBar } from "@/components/layout/MobileQuickBar";
import { Navbar } from "@/components/navigation/Navbar";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <Navbar />
      <main
        id="main-content"
        className="flex flex-1 flex-col pb-[calc(var(--mobile-quick-bar-offset)+env(safe-area-inset-bottom))] xl:pb-0"
      >
        {children}
      </main>
      <SiteFooter />
      <MobileQuickBar />
    </>
  );
}
