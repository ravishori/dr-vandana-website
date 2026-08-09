import { z } from "zod";

import {
  appointmentConfig,
  getEnabledOptions,
} from "@/data/appointment-enquiry";
import {
  isBasicEmail,
  isBasicIndianMobile,
} from "@/lib/appointment-form";
import type {
  AgeGroupValue,
  AppointmentFormValues,
  ConfigOption,
  ConsultationModeValue,
  ContactMethodValue,
  PreferredDayValue,
  PreferredTimeValue,
} from "@/types/appointment-enquiry";

type NormalizedAppointmentInput = {
  fullName: string;
  ageGroup: AgeGroupValue | undefined;
  consultationMode: ConsultationModeValue | undefined;
  contactMethod: ContactMethodValue | undefined;
  contactValue: string | undefined;
  preferredDay: PreferredDayValue | undefined;
  preferredTime: PreferredTimeValue | undefined;
  briefReason: string | undefined;
  privacyAccepted: boolean;
};

function trimCollapsed(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asOptionalEnumValue<T extends string>(
  value: unknown,
): T | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? (trimmed as T) : undefined;
}

/**
 * Conservative normalization before Zod validation.
 * Does not alter clinical meaning or invent missing values.
 */
export function normalizeAppointmentInput(
  input: AppointmentFormValues,
): NormalizedAppointmentInput {
  return {
    fullName: trimCollapsed(input.fullName),
    ageGroup: asOptionalEnumValue<AgeGroupValue>(input.ageGroup),
    consultationMode: asOptionalEnumValue<ConsultationModeValue>(
      input.consultationMode,
    ),
    contactMethod: asOptionalEnumValue<ContactMethodValue>(
      input.contactMethod,
    ),
    contactValue: trimOptional(input.contactValue),
    preferredDay: asOptionalEnumValue<PreferredDayValue>(input.preferredDay),
    preferredTime: asOptionalEnumValue<PreferredTimeValue>(
      input.preferredTime,
    ),
    briefReason: trimOptional(input.briefReason),
    privacyAccepted: input.privacyAccepted === true,
  };
}

function enabledOptionValues<T extends string>(
  options: readonly ConfigOption<T>[],
): T[] {
  return getEnabledOptions(options).map((option) => option.value);
}

const enabledAgeGroups = enabledOptionValues(appointmentConfig.ageGroups);
const enabledConsultationModes = enabledOptionValues(
  appointmentConfig.consultationModes,
);
const enabledContactMethods = enabledOptionValues(
  appointmentConfig.contactMethods,
);
const enabledPreferredDays = enabledOptionValues(
  appointmentConfig.preferredDays,
);
const enabledPreferredTimes = enabledOptionValues(
  appointmentConfig.preferredTimes,
);

const ageGroupSchema = z.enum(
  enabledAgeGroups as [AgeGroupValue, ...AgeGroupValue[]],
);

/**
 * Shared authoritative enquiry schema aligned with AppointmentFormValues
 * and server-side appointmentConfig (never trust browser-enabled flags).
 */
export const appointmentEnquirySchema = z
  .object({
    fullName: z
      .string()
      .min(
        appointmentConfig.fullNameMinLength,
        "Please enter a name between 2 and 80 characters.",
      )
      .max(
        appointmentConfig.fullNameMaxLength,
        "Please enter a name between 2 and 80 characters.",
      ),
    ageGroup: ageGroupSchema,
    consultationMode: z.string().optional(),
    contactMethod: z.string().optional(),
    contactValue: z.string().optional(),
    preferredDay: z.string().optional(),
    preferredTime: z.string().optional(),
    briefReason: z
      .string()
      .max(
        appointmentConfig.briefReasonMaxLength,
        "Please shorten the note to 300 characters.",
      )
      .optional(),
    privacyAccepted: z.literal(true, {
      error: "Please confirm the privacy acknowledgement.",
    }),
  })
  .superRefine((data, ctx) => {
    if (enabledConsultationModes.length > 0) {
      if (!data.consultationMode) {
        ctx.addIssue({
          code: "custom",
          path: ["consultationMode"],
          message: "Please select a preferred consultation mode.",
        });
      } else if (
        !enabledConsultationModes.includes(
          data.consultationMode as ConsultationModeValue,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["consultationMode"],
          message: "Please select a valid consultation mode.",
        });
      }
    } else if (data.consultationMode) {
      ctx.addIssue({
        code: "custom",
        path: ["consultationMode"],
        message: "Consultation mode is not available for this enquiry.",
      });
    }

    if (enabledContactMethods.length > 0) {
      if (!data.contactMethod) {
        ctx.addIssue({
          code: "custom",
          path: ["contactMethod"],
          message: "Please select a contact method.",
        });
      } else if (
        !enabledContactMethods.includes(
          data.contactMethod as ContactMethodValue,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["contactMethod"],
          message: "Please select a valid contact method.",
        });
      } else {
        const contactValue = data.contactValue;
        if (!contactValue) {
          ctx.addIssue({
            code: "custom",
            path: ["contactValue"],
            message:
              data.contactMethod === "email"
                ? "Please enter a valid email address."
                : "Please enter a valid mobile number.",
          });
        } else if (
          data.contactMethod === "email" &&
          !isBasicEmail(contactValue)
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["contactValue"],
            message: "Please enter a valid email address.",
          });
        } else if (
          (data.contactMethod === "phone" ||
            data.contactMethod === "whatsapp") &&
          !isBasicIndianMobile(contactValue)
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["contactValue"],
            message: "Please enter a valid mobile number.",
          });
        }
      }
    } else {
      if (data.contactMethod) {
        ctx.addIssue({
          code: "custom",
          path: ["contactMethod"],
          message: "Contact method is not available for this enquiry.",
        });
      }
      if (data.contactValue) {
        ctx.addIssue({
          code: "custom",
          path: ["contactValue"],
          message: "Contact information is not available for this enquiry.",
        });
      }
    }

    if (
      data.preferredDay &&
      !enabledPreferredDays.includes(data.preferredDay as PreferredDayValue)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["preferredDay"],
        message: "Please select a valid preferred day.",
      });
    }

    if (
      data.preferredTime &&
      !enabledPreferredTimes.includes(data.preferredTime as PreferredTimeValue)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["preferredTime"],
        message: "Please select a valid preferred time.",
      });
    }
  });

export type AppointmentEnquiryParsed = z.infer<typeof appointmentEnquirySchema>;

export function flattenAppointmentFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof AppointmentFormValues, string[]>> {
  const fieldErrors: Partial<Record<keyof AppointmentFormValues, string[]>> =
    {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") {
      continue;
    }
    const field = key as keyof AppointmentFormValues;
    const existing = fieldErrors[field] ?? [];
    existing.push(issue.message);
    fieldErrors[field] = existing;
  }

  return fieldErrors;
}
