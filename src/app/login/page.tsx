import type { Metadata } from "next";

import { LoginRoleChooser } from "@/components/auth/LoginRoleChooser";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Welcome back. Choose whether to continue as a psychologist or client. Role selection is not authorization.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <Section
      aria-labelledby="login-heading"
      className="bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--color-brand-muted)_16%,transparent),transparent_48%)]"
    >
      <Container className="py-4 md:py-8">
        <span id="login-heading" className="sr-only">
          Login
        </span>
        <LoginRoleChooser />
      </Container>
    </Section>
  );
}
