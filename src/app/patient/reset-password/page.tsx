import { ResetPasswordForm } from "@/components/identity/PatientAuthForms";
import { IdentityShell } from "@/components/identity/IdentityShell";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
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
