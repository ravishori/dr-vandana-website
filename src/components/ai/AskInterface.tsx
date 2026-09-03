"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { AskDisclaimer } from "@/components/ai/AskDisclaimer";
import { AskMarkdown } from "@/components/ai/AskMarkdown";
import { AskSupportCta } from "@/components/ai/AskSupportCta";
import { QuickQuestionCards } from "@/components/ai/QuickQuestionCards";
import { appointmentControlClassName } from "@/components/appointment/AppointmentField";
import { ArrowRightIcon } from "@/components/ui/icons";
import { suggestedStarterQuestions } from "@/data/ai/quick-questions";
import { cn } from "@/lib/utils";
import type { AskAiResponse, QuickQuestionCard } from "@/types/ai";

type ChatTurn = {
  question: string;
  response?: AskAiResponse;
  error?: string;
};

type AskInterfaceProps = {
  cards: readonly QuickQuestionCard[];
};

export function AskInterface({ cards }: AskInterfaceProps) {
  const fieldId = useId();
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState(false);

  async function submit(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || pending) {
      return;
    }

    setPending(true);
    setQuestion("");
    setTurns((current) => [...current, { question: trimmed }]);

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          conversation_id: conversationId,
          language: "en",
        }),
      });

      const payload = (await response.json()) as
        | AskAiResponse
        | { ok?: false; error?: { message?: string } };

      if (!response.ok || !("answer" in payload)) {
        const message =
          "error" in payload
            ? payload.error?.message
            : "Please try that question again in a moment.";
        setTurns((current) => {
          const copy = [...current];
          const last = copy.at(-1);
          if (last) {
            copy[copy.length - 1] = {
              ...last,
              error: message ?? "Please try that question again in a moment.",
            };
          }
          return copy;
        });
        return;
      }

      setConversationId(payload.conversation_id);
      setTurns((current) => {
        const copy = [...current];
        const last = copy.at(-1);
        if (last) {
          copy[copy.length - 1] = { ...last, response: payload };
        }
        return copy;
      });
    } catch {
      setTurns((current) => {
        const copy = [...current];
        const last = copy.at(-1);
        if (last) {
          copy[copy.length - 1] = {
            ...last,
            error: "The assistant is temporarily unavailable.",
          };
        }
        return copy;
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(question);
        }}
      >
        <label htmlFor={fieldId} className="text-text block text-sm font-medium">
          Ask a psychology question
        </label>
        <textarea
          id={fieldId}
          name="question"
          rows={4}
          maxLength={2000}
          value={question}
          disabled={pending}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask a psychology question..."
          className={cn(appointmentControlClassName, "min-h-28 resize-y")}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AskDisclaimer className="text-text-muted max-w-2xl text-sm leading-relaxed" />
          <button
            type="submit"
            disabled={pending || question.trim().length === 0}
            className="bg-accent text-text hover:bg-accent/90 inline-flex min-h-[var(--touch-target-min)] items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Thinking…" : "Ask"}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </form>

      {turns.length === 0 ? (
        <div className="space-y-4">
          <p className="text-text-muted text-sm font-medium tracking-[0.12em] uppercase">
            Suggested questions
          </p>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {suggestedStarterQuestions.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="border-brand-muted/40 bg-surface text-brand hover:border-brand rounded-full border px-4 py-2 text-sm"
                  onClick={() => void submit(item)}
                >
                  “{item}”
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <QuickQuestionCards
        cards={cards}
        disabled={pending}
        onSelect={(item) => void submit(item)}
      />

      <div aria-live="polite" className="space-y-6">
        {turns.map((turn, index) => (
          <article
            key={`${turn.question}-${index}`}
            className="border-brand-muted/25 bg-surface rounded-[var(--radius-xl)] border p-5 shadow-[var(--shadow-sm)] md:p-6"
          >
            <p className="text-text-muted text-sm font-medium tracking-[0.12em] uppercase">
              Your question
            </p>
            <p className="text-text mt-2 text-base font-medium">{turn.question}</p>

            {turn.error ? (
              <p className="text-brand mt-4" role="alert">
                {turn.error}
              </p>
            ) : null}

            {turn.response ? (
              <div className="mt-5 space-y-6">
                <AskMarkdown content={turn.response.answer} />

                {turn.response.sources.length > 0 ? (
                  <div>
                    <h3 className="text-lg">Sources</h3>
                    <ul className="text-text-muted mt-2 list-disc space-y-1 pl-5 text-sm">
                      {turn.response.sources.map((source) => (
                        <li key={`${source.title}-${source.attribution}`}>
                          {source.attribution}
                          {source.title ? ` — ${source.title}` : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {turn.response.related_questions.length > 0 ? (
                  <div>
                    <h3 className="text-lg">Related questions</h3>
                    <ul className="mt-3 flex flex-col gap-2">
                      {turn.response.related_questions.map((related) => (
                        <li key={related}>
                          <button
                            type="button"
                            className="text-brand hover:text-brand-muted text-left text-sm underline-offset-4 hover:underline"
                            onClick={() => void submit(related)}
                          >
                            {related}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {turn.response.case_study_slug ? (
                  <p className="text-sm">
                    <Link
                      href={`/psychology/case-studies/${turn.response.case_study_slug}`}
                    >
                      Open the educational case study
                    </Link>
                  </p>
                ) : null}

                {turn.response.show_support_cta ? <AskSupportCta /> : null}

                <p className="text-text-muted text-sm leading-relaxed">
                  {turn.response.safety_notice}
                </p>
              </div>
            ) : pending && index === turns.length - 1 ? (
              <p className="text-text-muted mt-4 text-sm">Preparing a careful answer…</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
