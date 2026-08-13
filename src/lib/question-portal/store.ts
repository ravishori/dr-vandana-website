import { resolveQuestionStoreMode } from "@/config/question-portal";
import { MemoryQuestionRepository } from "@/lib/question-portal/memory-store";
import type { QuestionRepository } from "@/lib/question-portal/repository";
import { SqliteQuestionRepository } from "@/lib/question-portal/sqlite-store";
import { UpstashQuestionRepository } from "@/lib/question-portal/upstash-store";

let repository: QuestionRepository | null = null;

export function getQuestionRepository(): QuestionRepository {
  if (repository) {
    return repository;
  }
  const mode = resolveQuestionStoreMode();
  if (mode === "misconfigured") {
    throw new Error("QUESTION_STORE_MISCONFIGURED");
  }
  if (mode === "memory") {
    repository = new MemoryQuestionRepository();
    return repository;
  }
  if (mode === "upstash") {
    repository = new UpstashQuestionRepository();
    return repository;
  }
  repository = new SqliteQuestionRepository();
  return repository;
}

export function setQuestionRepositoryForTests(
  next: QuestionRepository | null,
): void {
  repository = next;
}
