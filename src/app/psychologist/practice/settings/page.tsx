import { loadPracticeSettingsPage } from "@/app/psychologist/practice/actions";
import { PracticeNav } from "@/components/practice/PracticeNav";
import { PracticeSettingsForm } from "@/components/practice/PracticeSettingsForm";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default async function PracticeSettingsPage() {
  const result = await loadPracticeSettingsPage();
  if (!result.ok) {
    return (
      <Section className="pt-12 md:pt-16">
        <Container>
          <h1>Practice settings</h1>
          <p>{result.message}</p>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="pt-12 md:pt-16">
      <Container className="max-w-3xl">
        <PracticeNav current="/psychologist/practice/settings" />
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Practice
        </p>
        <h1 className="mt-4">Practice settings</h1>
        <p className="text-text-muted mt-3 max-w-2xl text-sm leading-relaxed">
          Configure booking rules, weekly hours, and appointment types. These
          settings drive availability for authenticated booking.
        </p>
        <PracticeSettingsForm settings={result.settings} />
      </Container>
    </Section>
  );
}
