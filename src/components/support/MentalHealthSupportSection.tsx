import { SupportAreaBlock } from "@/components/support/SupportAreaBlock";
import { mentalHealthSupportArea } from "@/data/support";

export function MentalHealthSupportSection() {
  return <SupportAreaBlock area={mentalHealthSupportArea} tone="muted" />;
}
