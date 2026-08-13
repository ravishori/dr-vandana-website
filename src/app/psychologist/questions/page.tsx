import Link from "next/link";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { questionPortalCopy } from "@/data/question-portal";
import { getPsychologistSession } from "@/lib/question-portal/auth";
import { listPsychologistQuestions, previewQuestion } from "@/lib/question-portal/service";
import {
  QUESTION_PRIORITIES,
  QUESTION_STATUSES,
  type QuestionCategory,
  type QuestionPriority,
  type QuestionStatus,
} from "@/types/question-portal";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function PsychologistQuestionsPage({
  searchParams,
}: PageProps) {
  const session = await getPsychologistSession();
  if (!session) {
    redirect("/psychologist/login");
  }
  const params = await searchParams;
  const status = readParam(params.status) as QuestionStatus | undefined;
  const category = readParam(params.category) as QuestionCategory | undefined;
  const priority = readParam(params.priority) as QuestionPriority | undefined;
  const search = readParam(params.q);
  const page = Number.parseInt(readParam(params.page) ?? "1", 10) || 1;

  const result = await listPsychologistQuestions(session, {
    status: status && QUESTION_STATUSES.includes(status) ? status : undefined,
    category,
    priority:
      priority && QUESTION_PRIORITIES.includes(priority) ? priority : undefined,
    search,
    page,
    pageSize: 20,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <Section className="pt-10">
      <Container>
        <h1>Submitted questions</h1>
        <form className="mt-6 grid gap-3 md:grid-cols-4" method="get">
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search reference, name, or wording"
            className="border-brand-muted/40 bg-surface rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="border-brand-muted/40 bg-surface rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {QUESTION_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="border-brand-muted/40 bg-surface rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {questionPortalCopy.categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            name="priority"
            defaultValue={priority ?? ""}
            className="border-brand-muted/40 bg-surface rounded-[var(--radius-md)] border px-3 py-2 text-sm"
          >
            <option value="">All priorities</option>
            {QUESTION_PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm md:col-span-4 md:w-fit"
          >
            Filter
          </button>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="text-text-muted border-b">
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Preview</th>
                <th className="py-2 pr-3 font-medium">Submitted</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Priority</th>
                <th className="py-2 font-medium">From</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="border-b border-brand-muted/20">
                  <td className="py-3 pr-3">
                    <Link href={`/psychologist/questions/${item.publicReferenceId}`}>
                      {item.publicReferenceId}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">{item.category ?? "—"}</td>
                  <td className="py-3 pr-3">{previewQuestion(item.question)}</td>
                  <td className="py-3 pr-3">
                    {new Date(item.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 pr-3">{item.status.replaceAll("_", " ")}</td>
                  <td className="py-3 pr-3">{item.priority}</td>
                  <td className="py-3">
                    {item.name || item.email || "Anonymous"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.items.length === 0 ? (
          <p className="text-text-muted mt-6 text-sm">No matching submissions.</p>
        ) : null}
        {totalPages > 1 ? (
          <p className="mt-6 text-sm">
            Page {result.page} of {totalPages}
          </p>
        ) : null}
      </Container>
    </Section>
  );
}
