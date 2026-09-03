import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appointmentConfig,
  getEnabledOptions,
} from "@/data/appointment-enquiry";
import {
  emptyAppointmentFormValues,
  isBasicEmail,
  isBasicIndianMobile,
  validateAppointmentForm,
} from "@/lib/appointment-form";
import type { AppointmentFormValues } from "@/types/appointment-enquiry";

function values(
  overrides: Partial<AppointmentFormValues> = {},
): AppointmentFormValues {
  return { ...emptyAppointmentFormValues, ...overrides };
}

const enabledModes = getEnabledOptions(appointmentConfig.consultationModes);
const enabledMethods = getEnabledOptions(appointmentConfig.contactMethods);
const whatsappEnabled = enabledMethods.some(
  (option) => option.value === "whatsapp",
);

describe("validateAppointmentForm", () => {
  it("reports all live mandatory errors on a completely empty form", () => {
    const errors = validateAppointmentForm(emptyAppointmentFormValues);

    assert.equal(errors.fullName, "Please enter your full name.");
    assert.equal(errors.ageGroup, "Please select an age group.");
    assert.equal(errors.contactMethod, "Please select a contact method.");
    assert.equal(
      errors.privacyAccepted,
      "Please confirm the privacy acknowledgement.",
    );
    assert.equal(errors.preferredDay, undefined);
    assert.equal(errors.preferredTime, undefined);
    assert.equal(errors.briefReason, undefined);
    assert.equal(errors.contactValue, undefined);

    if (enabledModes.length === 0) {
      assert.equal(errors.consultationMode, undefined);
    } else {
      assert.equal(
        errors.consultationMode,
        "Please select a preferred consultation mode.",
      );
    }
  });

  it("keeps other mandatory errors when only the name is entered", () => {
    const errors = validateAppointmentForm(values({ fullName: "Anita Sharma" }));

    assert.equal(errors.fullName, undefined);
    assert.equal(errors.ageGroup, "Please select an age group.");
    assert.equal(errors.contactMethod, "Please select a contact method.");
    assert.equal(
      errors.privacyAccepted,
      "Please confirm the privacy acknowledgement.",
    );
  });

  it("keeps remaining mandatory errors when name and age are entered", () => {
    const errors = validateAppointmentForm(
      values({ fullName: "Anita Sharma", ageGroup: "26_40" }),
    );

    assert.equal(errors.fullName, undefined);
    assert.equal(errors.ageGroup, undefined);
    assert.equal(errors.contactMethod, "Please select a contact method.");
    assert.equal(
      errors.privacyAccepted,
      "Please confirm the privacy acknowledgement.",
    );
  });

  it("reports privacy error only when privacy is the sole missing mandatory field", () => {
    assert.ok(whatsappEnabled, "WhatsApp must be enabled for this scenario");

    const errors = validateAppointmentForm(
      values({
        fullName: "Anita Sharma",
        ageGroup: "26_40",
        contactMethod: "whatsapp",
        contactValue: "9876543210",
        privacyAccepted: false,
      }),
    );

    assert.deepEqual(Object.keys(errors), ["privacyAccepted"]);
    assert.equal(
      errors.privacyAccepted,
      "Please confirm the privacy acknowledgement.",
    );
  });

  it("requires contact value after a contact method is selected", () => {
    assert.ok(whatsappEnabled, "WhatsApp must be enabled for this scenario");

    const errors = validateAppointmentForm(
      values({
        fullName: "Anita Sharma",
        ageGroup: "26_40",
        contactMethod: "whatsapp",
        contactValue: "",
        privacyAccepted: true,
      }),
    );

    assert.equal(errors.contactMethod, undefined);
    assert.equal(errors.contactValue, "Please enter a valid mobile number.");
  });

  it("rejects invalid Indian mobile numbers for WhatsApp", () => {
    assert.ok(whatsappEnabled, "WhatsApp must be enabled for this scenario");

    const errors = validateAppointmentForm(
      values({
        fullName: "Anita Sharma",
        ageGroup: "26_40",
        contactMethod: "whatsapp",
        contactValue: "12345",
        privacyAccepted: true,
      }),
    );

    assert.equal(errors.contactValue, "Please enter a valid mobile number.");
  });

  it("accepts all mandatory fields with optional fields empty", () => {
    assert.ok(whatsappEnabled, "WhatsApp must be enabled for this scenario");

    const errors = validateAppointmentForm(
      values({
        fullName: "Anita Sharma",
        ageGroup: "26_40",
        contactMethod: "whatsapp",
        contactValue: "9876543210",
        preferredDay: "",
        preferredTime: "",
        briefReason: "",
        privacyAccepted: true,
      }),
    );

    assert.deepEqual(errors, {});
  });

  it("accepts a fully completed form including optional preferences", () => {
    assert.ok(whatsappEnabled, "WhatsApp must be enabled for this scenario");

    const errors = validateAppointmentForm(
      values({
        fullName: "Anita Sharma",
        ageGroup: "26_40",
        contactMethod: "whatsapp",
        contactValue: "919876543210",
        preferredDay: "monday",
        preferredTime: "morning",
        briefReason: "work stress",
        privacyAccepted: true,
      }),
    );

    assert.deepEqual(errors, {});
  });

  it("preserves filled values by returning only missing-field errors", () => {
    assert.ok(whatsappEnabled, "WhatsApp must be enabled for this scenario");

    const filled = values({
      fullName: "Anita Sharma",
      ageGroup: "",
      contactMethod: "whatsapp",
      contactValue: "9876543210",
      privacyAccepted: false,
    });
    const errors = validateAppointmentForm(filled);

    assert.equal(filled.fullName, "Anita Sharma");
    assert.equal(filled.contactMethod, "whatsapp");
    assert.equal(filled.contactValue, "9876543210");
    assert.deepEqual(Object.keys(errors).sort(), [
      "ageGroup",
      "privacyAccepted",
    ]);
  });

  it("rejects overlong brief reason while keeping optionality when empty", () => {
    assert.ok(whatsappEnabled, "WhatsApp must be enabled for this scenario");

    const emptyReason = validateAppointmentForm(
      values({
        fullName: "Anita Sharma",
        ageGroup: "26_40",
        contactMethod: "whatsapp",
        contactValue: "9876543210",
        briefReason: "",
        privacyAccepted: true,
      }),
    );
    assert.equal(emptyReason.briefReason, undefined);

    const tooLong = validateAppointmentForm(
      values({
        fullName: "Anita Sharma",
        ageGroup: "26_40",
        contactMethod: "whatsapp",
        contactValue: "9876543210",
        briefReason: "x".repeat(appointmentConfig.briefReasonMaxLength + 1),
        privacyAccepted: true,
      }),
    );
    assert.equal(tooLong.briefReason, "Please shorten the note to 300 characters.");
  });
});

describe("appointment contact format helpers", () => {
  it("validates basic email shapes used when email contact is enabled", () => {
    assert.equal(isBasicEmail("person@example.com"), true);
    assert.equal(isBasicEmail("not-an-email"), false);
    assert.equal(isBasicEmail(""), false);
  });

  it("validates Indian mobile shapes used for phone and WhatsApp", () => {
    assert.equal(isBasicIndianMobile("9876543210"), true);
    assert.equal(isBasicIndianMobile("919876543210"), true);
    assert.equal(isBasicIndianMobile("+91 98765 43210"), true);
    assert.equal(isBasicIndianMobile("1234567890"), false);
    assert.equal(isBasicIndianMobile("98765"), false);
  });
});
