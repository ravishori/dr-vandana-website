import { PsychologistLoginForm } from "@/components/question-portal/PsychologistLoginForm";

type LoginPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function PsychologistLoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;
  const from =
    params.from && params.from.startsWith("/psychologist")
      ? params.from
      : undefined;
  return <PsychologistLoginForm from={from} />;
}
