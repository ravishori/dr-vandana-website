import { verifyEmailAction } from "@/app/patient/actions";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

type PageProps = { searchParams: Promise<{ token?: string }> };

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const result = token
    ? await verifyEmailAction(token)
    : { ok: false as const, message: "Missing token." };

  return (
    <Section className="pt-12">
      <Container className="max-w-lg">
        <h1>Email verification</h1>
        <p className="mt-4 text-sm">
          {result.ok ? "Email verified. You can continue." : result.message}
        </p>
        <div className="mt-6">
          <ButtonLink href="/patient/login">Sign in</ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
