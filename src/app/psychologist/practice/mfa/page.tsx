import { MfaForm } from "@/components/identity/PracticeAuthForms";

type PageProps = {
  searchParams: Promise<{ enroll?: string }>;
};

export default async function PsychologistMfaPage({ searchParams }: PageProps) {
  const { enroll } = await searchParams;
  return <MfaForm role="PSYCHOLOGIST" enroll={enroll === "1"} />;
}
