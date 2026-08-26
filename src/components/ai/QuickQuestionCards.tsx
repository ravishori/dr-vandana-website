import {
  AwarenessIcon,
  BookIcon,
  FamilyIcon,
  HeartIcon,
  LeafIcon,
  ListenIcon,
  PersonIcon,
  ShieldIcon,
  WorkIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { QuickQuestionCard } from "@/types/ai";

const icons = {
  anxiety: AwarenessIcon,
  stress: LeafIcon,
  relationships: HeartIcon,
  parenting: FamilyIcon,
  adolescents: PersonIcon,
  burnout: WorkIcon,
  mindfulness: ShieldIcon,
  esteem: PersonIcon,
  cases: BookIcon,
  counselling: ListenIcon,
} as const;

type QuickQuestionCardsProps = {
  cards: readonly QuickQuestionCard[];
  onSelect: (question: string) => void;
  disabled?: boolean;
};

export function QuickQuestionCards({
  cards,
  onSelect,
  disabled = false,
}: QuickQuestionCardsProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = icons[card.icon];
        return (
          <li key={card.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(card.question)}
              className={cn(
                "border-brand-muted/30 bg-surface hover:border-brand min-h-[7.5rem] w-full rounded-[var(--radius-lg)] border p-4 text-left shadow-[var(--shadow-sm)] transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none",
                "focus-visible:border-brand disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <Icon className="text-brand h-5 w-5" />
              <span className="text-brand mt-3 block font-serif text-base font-semibold">
                {card.title}
              </span>
              <span className="text-text-muted mt-1 block text-sm leading-snug">
                {card.description}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
