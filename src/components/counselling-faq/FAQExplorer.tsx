"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { appointmentControlClassName } from "@/components/appointment/AppointmentField";
import { faqCategoryLabels, faqEmptyState } from "@/data/counselling-faq/copy";
import {
  categoriesPresent,
  filterFaqs,
  getRelatedFaqs,
  relatedPageLabels,
} from "@/lib/counselling-faq/search";
import type { CounsellingFaq, FaqCategory } from "@/types/counselling-faq";
import { cn } from "@/lib/utils";

type FAQExplorerProps = {
  faqs: CounsellingFaq[];
};

export function FAQExplorer({ faqs }: FAQExplorerProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(
    faqs.find((faq) => faq.id === "what-is-psychological-counselling")?.id ??
      faqs[0]?.id ??
      null,
  );

  const categories = useMemo(() => categoriesPresent(faqs), [faqs]);
  const filtered = useMemo(
    () => filterFaqs(faqs, { query, category }),
    [faqs, query, category],
  );

  return (
    <div className="space-y-8">
      <div id="faq-search" className="scroll-mt-28 space-y-3">
        <label htmlFor={searchId} className="text-sm font-medium">
          Search your question
        </label>
        <input
          id={searchId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your question…"
          className={appointmentControlClassName}
          autoComplete="off"
          enterKeyHint="search"
        />
        <p className="text-text-muted text-xs">
          Search stays on this device. Queries are not sent to analytics.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="FAQ categories"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        <CategoryChip
          label="All"
          selected={category === "all"}
          onClick={() => setCategory("all")}
        />
        {categories.map((item) => (
          <CategoryChip
            key={item}
            label={faqCategoryLabels[item]}
            selected={category === item}
            onClick={() => setCategory(item)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border-brand-muted/30 bg-surface-soft rounded-[var(--radius-xl)] border px-5 py-6">
          <h3 className="text-xl">{faqEmptyState.heading}</h3>
          <p className="text-text-muted mt-3 text-sm leading-relaxed">
            {faqEmptyState.text}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Browse FAQs
            </button>
            <ButtonLink href="/contact" variant="secondary">
              Contact Dr. Vandana
            </ButtonLink>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((faq) => {
            const panelId = `faq-answer-${faq.id}`;
            const buttonId = `faq-button-${faq.id}`;
            const expanded = openId === faq.id;
            const related = expanded ? getRelatedFaqs(faqs, faq) : [];
            return (
              <li
                key={faq.id}
                className="border-brand-muted/30 bg-surface rounded-[var(--radius-xl)] border shadow-[var(--shadow-sm)]"
              >
                <h3 className="m-0 text-base md:text-lg">
                  <button
                    id={buttonId}
                    type="button"
                    className="hover:bg-surface-soft flex w-full items-start justify-between gap-4 rounded-[var(--radius-xl)] px-5 py-4 text-left"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() =>
                      setOpenId((current) =>
                        current === faq.id ? null : faq.id,
                      )
                    }
                  >
                    <span>{faq.question}</span>
                    <span className="text-brand mt-0.5 shrink-0 text-sm" aria-hidden>
                      {expanded ? "−" : "+"}
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!expanded}
                  className="border-brand-muted/20 border-t px-5 pt-4 pb-5"
                >
                  {faq.answer.split("\n\n").map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 24)}
                      className="text-text mt-3 text-sm leading-relaxed first:mt-0 md:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                  <p className="text-text-muted mt-4 text-xs">
                    {faqCategoryLabels[faq.category]}
                  </p>
                  {faq.relatedPageHrefs.length > 0 ? (
                    <ul className="mt-4 flex flex-wrap gap-3 text-sm">
                      {faq.relatedPageHrefs.map((href) => (
                        <li key={href}>
                          <Link href={href} className="text-brand">
                            {relatedPageLabels[href] ?? href}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {related.length > 0 ? (
                    <div className="mt-5">
                      <p className="text-sm font-medium">
                        You may also want to know:
                      </p>
                      <ul className="mt-2 space-y-2">
                        {related.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className="text-brand text-left text-sm underline-offset-4 hover:underline"
                              onClick={() => {
                                setCategory("all");
                                setQuery("");
                                setOpenId(item.id);
                              }}
                            >
                              {item.question}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-2 text-sm whitespace-nowrap",
        selected
          ? "border-brand bg-surface-soft text-brand"
          : "border-brand-muted/40 text-text-muted hover:border-brand",
      )}
    >
      {label}
    </button>
  );
}
