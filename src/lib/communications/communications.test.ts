import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { MemoryCommunicationsRepository } from "@/lib/communications/memory-store";
import {
  setCommunicationsEmailSenderForTests,
  type CommunicationsEmailSender,
} from "@/lib/communications/email";
import {
  createEnquiryConversation,
  listConversations,
  replyToConversation,
} from "@/lib/communications/service";
import { setCommunicationsRepositoryForTests } from "@/lib/communications/store";
import type { DoctorSession } from "@/types/doctor-portal";

const doctor: DoctorSession = {
  email: "doctor@example.com",
  role: "DOCTOR",
  issuedAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
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

describe("communications enquiry + reply", () => {
  it("creates a conversation from appointment enquiry data", async () => {
    const conversation = await createEnquiryConversation({
      fullName: "Alex Example",
      contactMethod: "email",
      contactValue: "alex@example.com",
      preferredDay: "monday",
      preferredTime: "morning",
      consultationMode: "online",
      ageGroup: "26_40",
      briefReason: "Work stress support",
    });

    assert.equal(conversation.status, "NEW");
    assert.equal(conversation.source, "appointment_enquiry");
    assert.equal(conversation.userEmail, "alex@example.com");
    assert.equal(conversation.messages.length, 1);
    assert.equal(conversation.messages[0]?.direction, "INBOUND");
    assert.match(conversation.messages[0]?.body ?? "", /Work stress support/);
  });

  it("persists reply even when email delivery fails", async () => {
    const conversation = await createEnquiryConversation({
      fullName: "Alex Example",
      contactMethod: "email",
      contactValue: "alex@example.com",
      briefReason: "Sleep concerns",
    });

    const result = await replyToConversation(
      doctor,
      conversation.id,
      "Thank you for your enquiry. We will follow up with availability.",
    );

    assert.equal(result.emailOk, false);
    assert.equal(result.conversation.status, "REPLIED");
    const outbound = result.conversation.messages.find(
      (message) => message.direction === "OUTBOUND",
    );
    assert.ok(outbound);
    assert.equal(outbound.emailDeliveryStatus, "failed");
    assert.match(outbound.body, /Thank you for your enquiry/);
  });

  it("rejects unauthorized conversation listing", async () => {
    await assert.rejects(() => listConversations(null), /UNAUTHORIZED/);
  });
});
