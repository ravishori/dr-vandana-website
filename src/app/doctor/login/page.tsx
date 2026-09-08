import { DoctorLoginForm } from "@/components/doctor/DoctorLoginForm";

type LoginPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function DoctorLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const from =
    params.from && params.from.startsWith("/doctor")
      ? params.from
      : "/doctor/dashboard";

  return <DoctorLoginForm from={from} />;
}
