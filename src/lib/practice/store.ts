import { practiceConfig, resolvePracticeStoreMode } from "@/config/practice";
import {
  getGlobalMemoryPracticeRepository,
  MemoryPracticeRepository,
} from "@/lib/practice/memory-store";
import type { PracticeRepository } from "@/lib/practice/repository";
import { SqlitePracticeRepository } from "@/lib/practice/sqlite-store";
import { hashPassword } from "@/lib/question-portal/password";

let repository: PracticeRepository | null = null;

export async function getPracticeRepository(): Promise<PracticeRepository> {
  if (!repository) {
    const mode = resolvePracticeStoreMode();
    if (mode === "misconfigured") {
      throw new Error("PRACTICE_STORE_MISCONFIGURED");
    }
    repository =
      mode === "memory"
        ? getGlobalMemoryPracticeRepository()
        : new SqlitePracticeRepository(practiceConfig.sqlitePath);
  }
  await repository.ensureSeeded();
  await ensureBootstrapPsychologist(repository);
  return repository;
}

export function setPracticeRepositoryForTests(
  next: PracticeRepository | null,
): void {
  repository = next;
}

async function ensureBootstrapPsychologist(
  repo: PracticeRepository,
): Promise<void> {
  const email = practiceConfig.bootstrapPsychologistEmail?.toLowerCase();
  const hash = practiceConfig.bootstrapPsychologistPasswordHash;
  if (!email || !hash) {
    return;
  }
  const existing = await repo.getUserByEmail(email);
  if (existing) {
    return;
  }
  const now = new Date().toISOString();
  await repo.createUser({
    id: crypto.randomUUID(),
    email,
    mobile: null,
    passwordHash: hash,
    role: "PSYCHOLOGIST",
    fullName: "Dr. Vandana Rajiv Chaudhary",
    emailVerifiedAt: now,
    mobileVerifiedAt: now,
    mfaEnabled: false,
    mfaSecretEnc: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function createTestPsychologist(
  email = "vandana@example.test",
  password = "TestPassword!23456",
): Promise<{ userId: string; password: string }> {
  const repo = new MemoryPracticeRepository();
  await repo.ensureSeeded();
  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  await repo.createUser({
    id: userId,
    email,
    mobile: null,
    passwordHash: await hashPassword(password),
    role: "PSYCHOLOGIST",
    fullName: "Dr. Vandana Rajiv Chaudhary",
    emailVerifiedAt: now,
    mobileVerifiedAt: now,
    mfaEnabled: false,
    mfaSecretEnc: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  setPracticeRepositoryForTests(repo);
  return { userId, password };
}
