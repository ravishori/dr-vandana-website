import { EDUCATIONAL_DISCLAIMER } from "@/data/ai/disclaimer";

export function AskDisclaimer({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-text-muted text-sm leading-relaxed"}>
      {EDUCATIONAL_DISCLAIMER}
    </p>
  );
}
