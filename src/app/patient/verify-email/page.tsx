import { verifyEmailAction } from "@/app/patient/actions";
import { ResendEmailForm } from "@/components/identity/PatientAuthForms";
import { IdentityShell } from "@/components/identity/IdentityShell";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailAction(token) : null;
  return (
    <IdentityShell kicker="Patient accounts" title="Verify your email">
      <p>
        {result?.message ??
          "Open the verification link from your email, or request a new message below."}
      </p>
      {result?.ok ? (
        <p>
          <a className="underline" href="/patient/verify-phone">
            Continue to mobile verification
          </a>
        </p>
      ) : (
        <ResendEmailForm />
      )}
    </IdentityShell>
  );
}
