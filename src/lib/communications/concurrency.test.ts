import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { MemoryCommunicationsRepository } from "@/lib/communications/memory-store";
import {
  setCommunicationsEmailSenderForTests,
  type CommunicationsEmailSender,
} from "@/lib/communications/email";
import {
  createEnquiryConversation,
  replyToConversation,
  retrySendReply,
} from "@/lib/communications/service";
import { setCommunicationsRepositoryForTests } from "@/lib/communications/store";
import { ConcurrencyConflictError } from "@/lib/persistence/optimistic-update";
import type { DoctorSession } from "@/types/doctor-portal";

const doctor: DoctorSession = {
  email: "doctor@example.com",
  role: "DOCTOR",
  issuedAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

const okEmailSender: CommunicationsEmailSender = {
  async sendDoctorNewEnquiryNotification() {
    return { ok: true, messageId: "<notify@test>" };
  },
  async sendUserReply() {
    return { ok: true, messageId: "<reply@test>" };
  },
};

const failingEmailSender: CommunicationsEmailSender = {
  async sendDoctorNewEnquiryNotification() {
    return { ok: true, messageId: "<notify@test>" };
  },
  async sendUserReply() {
    return { ok: false, reason: "provider_error" };
  },
};

beforeEach(async () => {
  const repo = new MemoryCommunicationsRepository({ bundle: null });
  await repo.ensureSeeded();
  setCommunicationsRepositoryForTests(repo);
  setCommunicationsEmailSenderForTests(failingEmailSender);
});

afterEach(() => {
  setCommunicationsRepositoryForTests(null);
  setCommunicationsEmailSenderForTests(null);
});

describe("communications concurrency", () => {
  it("retains both concurrent enquiry conversations", async () => {
    const [one, two] = await Promise.all([
      createEnquiryConversation({
        fullName: "Person One",
        contactMethod: "email",
        contactValue: "one@example.com",
        briefReason: "First concurrent enquiry",
      }),
      createEnquiryConversation({
        fullName: "Person Two",
        contactMethod: "email",
        contactValue: "two@example.com",
        briefReason: "Second concurrent enquiry",
      }),
    ]);

    const repo = await import("@/lib/communications/store").then((m) =>
      m.getCommunicationsRepository(),
    );
    const bundle = await repo.read();
    const ids = bundle.conversations.map((item) => item.id).sort();
    assert.deepEqual(ids.sort(), [one.id, two.id].sort());
    assert.ok(bundle.revision >= 2);
  });
});

describe("communications recipient + retry hardening", () => {
  it("stores phone enquiries without fabricating an email recipient", async () => {
    const conversation = await createEnquiryConversation({
      fullName: "Phone User",
      contactMethod: "phone",
      contactValue: "9876543210",
      briefReason: "Phone-only enquiry for recipient hardening",
    });

    assert.equal(conversation.userEmail, "");
    assert.equal(conversation.userPhone, "9876543210");
    assert.notEqual(conversation.userEmail, "unknown@invalid.local");
  });

  it("rejects email reply when no valid recipient exists", async () => {
    const conversation = await createEnquiryConversation({
      fullName: "Phone User",
      contactMethod: "whatsapp",
      contactValue: "9876543210",
      briefReason: "WhatsApp enquiry without email",
    });

    await assert.rejects(
      () =>
        replyToConversation(
          doctor,
          conversation.id,
          "This should not create an outbound email attempt.",
        ),
      /EMAIL_REPLY_UNAVAILABLE/,
    );

    const repo = await import("@/lib/communications/store").then((m) =>
      m.getCommunicationsRepository(),
    );
    const bundle = await repo.read();
    const current = bundle.conversations.find((item) => item.id === conversation.id);
    assert.ok(current);
    assert.equal(
      current.messages.filter((message) => message.direction === "OUTBOUND")
        .length,
      0,
    );
  });

  it("allows retry only for failed outbound messages", async () => {
    const conversation = await createEnquiryConversation({
      fullName: "Alex Example",
      contactMethod: "email",
      contactValue: "alex@example.com",
      briefReason: "Retry authorization checks",
    });

    const failed = await replyToConversation(
      doctor,
      conversation.id,
      "First reply that fails delivery.",
    );
    const failedMessage = failed.conversation.messages.find(
      (message) => message.direction === "OUTBOUND",
    );
    assert.ok(failedMessage);
    assert.equal(failedMessage.emailDeliveryStatus, "failed");

    setCommunicationsEmailSenderForTests(okEmailSender);
    const retried = await retrySendReply(
      doctor,
      conversation.id,
      failedMessage.id,
    );
    assert.equal(retried.emailOk, true);
    const sentMessage = retried.conversation.messages.find(
      (message) => message.id === failedMessage.id,
    );
    assert.equal(sentMessage?.emailDeliveryStatus, "sent");

    await assert.rejects(
      () => retrySendReply(doctor, conversation.id, failedMessage.id),
      /RETRY_NOT_ALLOWED/,
    );

    await assert.rejects(
      () => retrySendReply(doctor, conversation.id, "missing-message-id"),
      /NOT_FOUND/,
    );

    await assert.rejects(
      () => retrySendReply(null, conversation.id, failedMessage.id),
      /UNAUTHORIZED/,
    );
  });

  it("surfaces concurrency conflict when compareAndSet never succeeds", async () => {
    const repo = new MemoryCommunicationsRepository({
      bundle: { version: 1, revision: 0, conversations: [] },
    });
    setCommunicationsRepositoryForTests(repo);
    repo.compareAndSet = async () => false;

    await assert.rejects(
      () =>
        createEnquiryConversation({
          fullName: "Conflict User",
          contactMethod: "email",
          contactValue: "conflict@example.com",
          briefReason: "Force concurrency conflict",
        }),
      (error: unknown) =>
        error instanceof ConcurrencyConflictError ||
        (error instanceof Error && error.message === "CONCURRENCY_CONFLICT"),
    );
  });
});
