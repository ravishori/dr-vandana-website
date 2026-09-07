import { PracticeLoginForm } from "@/components/identity/PracticeAuthForms";

export default function PsychologistPracticeLoginPage() {
  return (
    <PracticeLoginForm
      role="PSYCHOLOGIST"
      title="Doctor Login"
      description="Sign in with your registered email or mobile number and password. This portal is for authorized practice staff only. The public question portal at /psychologist/login remains separate."
    />
  );
}
