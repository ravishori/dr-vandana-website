import { PracticeLoginForm } from "@/components/identity/PracticeAuthForms";

export default function PsychologistPracticeLoginPage() {
  return (
    <PracticeLoginForm
      role="PSYCHOLOGIST"
      title="Practice sign in"
      description="This is the new practice identity foundation. The existing question portal at /psychologist/login is unchanged."
    />
  );
}
