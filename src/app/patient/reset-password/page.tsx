import { ResetPasswordForm } from "@/components/identity/PatientAuthForms";
import { IdentityShell } from "@/components/identity/IdentityShell";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <IdentityShell kicker="Patient accounts" title="Reset password">
        <p>This reset link is not valid or has expired.</p>
      </IdentityShell>
    );
  }
  return <ResetPasswordForm token={token} />;
}
