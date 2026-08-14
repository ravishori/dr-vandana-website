import { PracticeLoginForm } from "@/components/identity/PracticeAuthForms";

export default function SuperAdminLoginPage() {
  return (
    <PracticeLoginForm
      role="SUPER_ADMIN"
      title="Super Admin sign in"
      description="There is no public registration for this role. Configuration tools are not enabled in this phase."
    />
  );
}
