import { professionalProfile } from "@/data/professional";
import type {
  AgeGroupValue,
  ConfigOption,
  ConsultationModeValue,
  ContactMethodValue,
  PreferredDayValue,
  PreferredTimeValue,
} from "@/types/appointment-enquiry";

export const appointmentEnquirySeo = {
  title: {
    absolute: `Appointment Enquiry | ${professionalProfile.name}`,
  },
  description:
    "Submit a simple appointment enquiry for psychological counselling and emotional wellness support. Please do not include sensitive clinical information.",
} as const;

export const appointmentEnquiryPage = {
  heading: "Appointment enquiry",
  introduction:
    "To help us understand how to assist you, this enquiry collects only the minimum information needed to respond.",
  privacyBoundary:
    "Please do not include detailed medical history, diagnosis information, therapy notes, medication details or other sensitive clinical information in a general website enquiry.",
  briefReasonHelper:
    "Please share only a short non-clinical note (for example, “work stress” or “support for my teenager”). Do not include detailed medical history, diagnosis information, medication details, therapy notes, or other sensitive clinical information.",
  privacyAcknowledgement:
    "I understand this is an appointment enquiry, not an emergency service. I agree that the information I submit will be used only to respond to this enquiry. I will not include sensitive clinical information. Submitting this form does not establish a therapist–client relationship, and this website is not an electronic health record system.",
  emergencyNotice:
    "This website is not an emergency service. If you are in immediate danger or experiencing a mental-health emergency, seek urgent help through your local emergency medical service or nearest emergency medical facility.",
  uiOnlySubmitMessage:
    "Form preview only — appointment enquiry submission will be enabled in a later milestone.",
  validationAcceptedMessage:
    "Your enquiry has passed validation and is ready for the next processing step.",
  enquirySubmittedMessage:
    "Your enquiry has been submitted successfully. The practice will contact you regarding availability.",
  deliveryFailedMessage:
    "We couldn't process your enquiry right now. Please try again later.",
  unexpectedSubmissionError:
    "Something went wrong while processing your enquiry. Please try again.",
  abuseRejectedMessage:
    "Unable to process this request. Please try again later.",
  rateLimitedMessage:
    "Please wait a little while before trying again.",
  consultationModesUnavailable:
    "Consultation options will be confirmed by the practice.",
  contactMethodsUnavailable:
    "Additional contact methods will be confirmed by the practice.",
  closing:
    "Your enquiry is a request for a response. It does not confirm an appointment time.",
} as const;

/**
 * Practice-facing enquiry configuration.
 * Enable contact methods only when verified.
 * Phone and Email remain disabled until separately verified.
 * Consultation modes remain disabled until independently verified (5G).
 */
export const appointmentConfig = {
  briefReasonMaxLength: 300,
  fullNameMaxLength: 80,
  fullNameMinLength: 2,
  ageGroups: [
    {
      value: "child_adolescent_parent",
      label: "Child or adolescent (parent/guardian enquiry)",
      enabled: true,
    },
    { value: "18_25", label: "18–25", enabled: true },
    { value: "26_40", label: "26–40", enabled: true },
    { value: "41_60", label: "41–60", enabled: true },
    { value: "60_plus", label: "60+", enabled: true },
    {
      value: "prefer_not_to_say",
      label: "Prefer not to say",
      enabled: true,
    },
  ] satisfies ConfigOption<AgeGroupValue>[],
  consultationModes: [
    { value: "in_person", label: "In-person", enabled: false },
    { value: "online", label: "Online", enabled: false },
    { value: "either", label: "Either", enabled: false },
  ] satisfies ConfigOption<ConsultationModeValue>[],
  contactMethods: [
    { value: "phone", label: "Phone", enabled: false },
    { value: "whatsapp", label: "WhatsApp", enabled: true },
    { value: "email", label: "Email", enabled: false },
  ] satisfies ConfigOption<ContactMethodValue>[],
  preferredDays: [
    { value: "monday", label: "Monday", enabled: true },
    { value: "tuesday", label: "Tuesday", enabled: true },
    { value: "wednesday", label: "Wednesday", enabled: true },
    { value: "thursday", label: "Thursday", enabled: true },
    { value: "friday", label: "Friday", enabled: true },
    { value: "saturday", label: "Saturday", enabled: true },
    { value: "sunday", label: "Sunday", enabled: true },
    { value: "no_preference", label: "No preference", enabled: true },
  ] satisfies ConfigOption<PreferredDayValue>[],
  preferredTimes: [
    { value: "morning", label: "Morning", enabled: true },
    { value: "afternoon", label: "Afternoon", enabled: true },
    { value: "evening", label: "Evening", enabled: true },
    { value: "no_preference", label: "No preference", enabled: true },
  ] satisfies ConfigOption<PreferredTimeValue>[],
} as const;

export function getEnabledOptions<T extends string>(
  options: readonly ConfigOption<T>[],
): ConfigOption<T>[] {
  return options.filter((option) => option.enabled);
}
