import { PracticeLoginForm } from "@/components/identity/PracticeAuthForms";

export default function PsychologistPracticeLoginPage() {
  return (
    <PracticeLoginForm
      role="PSYCHOLOGIST"
      title="Secure Practice Login"
      description="Sign in with your provisioned practice email and password, then complete 2-step verification with an authenticator app. This portal is for authorized practice staff only. The public question portal at /psychologist/login remains separate."
    />
  );
}
