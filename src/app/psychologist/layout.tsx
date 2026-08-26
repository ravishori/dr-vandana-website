import { PsychologistPortalNav } from "@/components/question-portal/PsychologistPortalNav";
import { getPsychologistSession } from "@/lib/question-portal/auth";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PsychologistLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getPsychologistSession();
  return (
    <>
      {session ? <PsychologistPortalNav session={session} /> : null}
      {children}
    </>
  );
}
