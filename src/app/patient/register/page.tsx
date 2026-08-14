import { PatientRegisterForm } from "@/components/identity/PatientRegisterForm";
import { isRegistrationAvailable } from "@/lib/identity/runtime";

export default function PatientRegisterPage() {
  return <PatientRegisterForm enabled={isRegistrationAvailable()} />;
}
