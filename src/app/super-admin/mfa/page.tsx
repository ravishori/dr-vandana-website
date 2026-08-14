import { MfaForm } from "@/components/identity/PracticeAuthForms";

type PageProps = {
  searchParams: Promise<{ enroll?: string }>;
};

export default async function SuperAdminMfaPage({ searchParams }: PageProps) {
  const { enroll } = await searchParams;
  return <MfaForm role="SUPER_ADMIN" enroll={enroll === "1"} />;
}
