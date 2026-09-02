import type { Metadata } from "next";

import { LoginSignInPanel } from "@/components/auth/LoginSignInPanel";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Secure sign-in placeholder. Client-selected role is never treated as authorization.",
  robots: {
    index: false,
    follow: false,
  },
};

type LoginSignInPageProps = {
  searchParams: Promise<{ intent?: string | string[] }>;
};

export default async function LoginSignInPage({
  searchParams,
}: LoginSignInPageProps) {
  const params = await searchParams;

  return (
    <Section aria-labelledby="signin-heading">
      <Container className="py-4 md:py-8">
        <span id="signin-heading" className="sr-only">
          Sign in
        </span>
        <LoginSignInPanel intentParam={params.intent} />
      </Container>
    </Section>
  );
}
