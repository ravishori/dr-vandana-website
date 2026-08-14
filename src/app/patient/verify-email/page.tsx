import { ResendEmailForm, VerifyEmailConfirmForm } from "@/components/identity/PatientAuthForms";
import { IdentityShell } from "@/components/identity/IdentityShell";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  if (token) {
    return <VerifyEmailConfirmForm token={token} />;
  }
  return (
    <IdentityShell kicker="Patient accounts" title="Verify your email">
      <p>
        Open the verification link from your email, or request a new message
        below.
      </p>
      <ResendEmailForm />
    </IdentityShell>
  );
}
