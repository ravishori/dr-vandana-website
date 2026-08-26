import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  curatedCrisisSeed,
  criticalCrisisFallback,
  initialCrisisVerifications,
} from "@/data/crisis/seed";
import { CRISIS_ANSWER } from "@/lib/ai/safety/canned";
import {
  MemoryCrisisRepository,
  resetMemoryCrisisRepositoryForTests,
} from "@/lib/crisis/memory-store";
import { isPublicCrisisResource } from "@/lib/crisis/repository";
import { crisisUpsertSchema, toTelHref } from "@/lib/crisis/schema";
import {
  listPublicCrisisResources,
  upsertCrisisResource,
} from "@/lib/crisis/service";
import { setCrisisRepositoryForTests } from "@/lib/crisis/store";
import { PSYCHOLOGIST_ROLE, type PsychologistSession } from "@/types/question-portal";

const actor: PsychologistSession = {
  email: "vandana@example.test",
  role: PSYCHOLOGIST_ROLE,
  expiresAt: Date.now() + 60_000,
  sessionId: "crisis-test-session",
};

describe("crisis resource directory", () => {
  beforeEach(async () => {
    resetMemoryCrisisRepositoryForTests();
    const repo = new MemoryCrisisRepository();
    setCrisisRepositoryForTests(repo);
    await repo.ensureSeeded(curatedCrisisSeed, initialCrisisVerifications);
  });

  it("publishes only verified active resources", async () => {
    const { resources, usedFallback } = await listPublicCrisisResources();
    assert.equal(usedFallback, false);
    assert.ok(resources.length >= 3);
    assert.ok(resources.every((item) => isPublicCrisisResource(item)));
    assert.equal(
      resources.some((item) => item.slug.includes("ncw")),
      false,
    );
  });

  it("includes 112, Tele-MANAS and Child Helpline in the public set", async () => {
    const { resources } = await listPublicCrisisResources();
    const phones = resources.flatMap((item) =>
      item.phoneNumbers.map((phone) => phone.display),
    );
    assert.ok(phones.includes("112"));
    assert.ok(phones.includes("14416"));
    assert.ok(phones.includes("1800-89-14416"));
    assert.ok(phones.includes("1098"));
  });

  it("rejects unauthorized upserts", async () => {
    await assert.rejects(
      () =>
        upsertCrisisResource(null, {
          ...curatedCrisisSeed[0],
          name: "Should fail",
        }),
      /UNAUTHORIZED/,
    );
  });

  it("rejects http official source URLs", () => {
    const parsed = crisisUpsertSchema.safeParse({
      ...curatedCrisisSeed[1],
      officialSourceUrl: "http://example.com/insecure",
    });
    assert.equal(parsed.success, false);
  });

  it("requires at least one phone number", () => {
    const parsed = crisisUpsertSchema.safeParse({
      ...curatedCrisisSeed[1],
      phoneNumbers: [],
    });
    assert.equal(parsed.success, false);
  });

  it("stores XSS payloads as plain text in descriptions", async () => {
    const payload = "<script>alert('xss')</script> Verified government example resource text.";
    const saved = await upsertCrisisResource(actor, {
      ...curatedCrisisSeed[1],
      id: "crisis-xss-test",
      slug: "xss-test-resource",
      description: payload,
      verificationStatus: "NEEDS_REVIEW",
      isActive: false,
    });
    assert.equal(saved.description.includes("<script>"), true);
  });

  it("builds tel hrefs without separators", () => {
    assert.equal(toTelHref("1800-89-14416"), "tel:18008914416");
    assert.equal(toTelHref("112"), "tel:112");
  });

  it("keeps a non-empty critical fallback", () => {
    assert.ok(criticalCrisisFallback.length >= 3);
    assert.ok(
      criticalCrisisFallback.every((item) => item.verificationStatus === "VERIFIED"),
    );
  });

  it("keeps AI crisis canned text free of unsafe promises", () => {
    assert.match(CRISIS_ANSWER, /14416/);
    assert.match(CRISIS_ANSWER, /112/);
    assert.equal(/i can keep you safe/i.test(CRISIS_ANSWER), false);
    assert.equal(/i am your therapist/i.test(CRISIS_ANSWER), false);
  });
});
