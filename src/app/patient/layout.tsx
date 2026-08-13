import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Patient Portal",
};

export default function PatientLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[70vh]">{children}</div>;
}
