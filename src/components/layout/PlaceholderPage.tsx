import { Container } from "@/components/ui/Container";

type PlaceholderPageProps = {
  title: string;
  description?: string;
};

/**
 * Minimal route placeholder so navigation is never broken.
 * Full page content belongs to later milestones.
 */
export function PlaceholderPage({
  title,
  description = "This page will be completed in a later milestone.",
}: PlaceholderPageProps) {
  return (
    <Container className="py-14 md:py-20">
      <h1>{title}</h1>
      <p className="text-text-muted mt-4 max-w-2xl text-base">{description}</p>
    </Container>
  );
}
