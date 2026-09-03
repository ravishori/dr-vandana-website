import {
  appointmentConfig,
  getEnabledOptions,
} from "@/data/appointment-enquiry";
import type {
  AppointmentFormErrors,
  AppointmentFormValues,
  ContactMethodValue,
} from "@/types/appointment-enquiry";

export const emptyAppointmentFormValues: AppointmentFormValues = {
  fullName: "",
  ageGroup: "",
  consultationMode: "",
  contactMethod: "",
  contactValue: "",
  preferredDay: "",
  preferredTime: "",
  briefReason: "",
  privacyAccepted: false,
};

/** Document order used for focus-first-invalid after failed validation. */
export const appointmentFormFieldOrder = [
  "fullName",
  "ageGroup",
  "consultationMode",
  "contactMethod",
  "contactValue",
  "preferredDay",
  "preferredTime",
  "briefReason",
  "privacyAccepted",
] as const satisfies ReadonlyArray<keyof AppointmentFormValues>;

export const appointmentClientValidationSummary =
  "Please complete the required information before submitting your enquiry.";

export function getContactFieldLabel(method: ContactMethodValue | ""): string {
  switch (method) {
    case "email":
      return "Email address";
    case "phone":
      return "Mobile number";
    case "whatsapp":
      return "WhatsApp number";
    default:
      return "Contact information";
  }
}

export function isBasicEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isBasicIndianMobile(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return /^91[6-9]\d{9}$/.test(digits);
  }
  return false;
}

export function validateAppointmentForm(
  values: AppointmentFormValues,
): AppointmentFormErrors {
  const errors: AppointmentFormErrors = {};
  const enabledModes = getEnabledOptions(appointmentConfig.consultationModes);
  const enabledMethods = getEnabledOptions(appointmentConfig.contactMethods);
  const enabledAgeGroups = getEnabledOptions(appointmentConfig.ageGroups);

  const fullName = values.fullName.trim();
  if (!fullName) {
    errors.fullName = "Please enter your full name.";
  } else if (
    fullName.length < appointmentConfig.fullNameMinLength ||
    fullName.length > appointmentConfig.fullNameMaxLength
  ) {
    errors.fullName = "Please enter a name between 2 and 80 characters.";
  }

  if (!values.ageGroup) {
    errors.ageGroup = "Please select an age group.";
  } else if (!enabledAgeGroups.some((option) => option.value === values.ageGroup)) {
    errors.ageGroup = "Please select a valid age group.";
  }

  if (enabledModes.length > 0) {
    if (!values.consultationMode) {
      errors.consultationMode = "Please select a preferred consultation mode.";
    } else if (
      !enabledModes.some((option) => option.value === values.consultationMode)
    ) {
      errors.consultationMode = "Please select a valid consultation mode.";
    }
  }

  if (enabledMethods.length > 0) {
    if (!values.contactMethod) {
      errors.contactMethod = "Please select a contact method.";
    } else if (
      !enabledMethods.some((option) => option.value === values.contactMethod)
    ) {
      errors.contactMethod = "Please select a valid contact method.";
    } else {
      const contactValue = values.contactValue.trim();
      if (!contactValue) {
        if (values.contactMethod === "email") {
          errors.contactValue = "Please enter a valid email address.";
        } else {
          errors.contactValue = "Please enter a valid mobile number.";
        }
      } else if (values.contactMethod === "email" && !isBasicEmail(contactValue)) {
        errors.contactValue = "Please enter a valid email address.";
      } else if (
        (values.contactMethod === "phone" ||
          values.contactMethod === "whatsapp") &&
        !isBasicIndianMobile(contactValue)
      ) {
        errors.contactValue = "Please enter a valid mobile number.";
      }
    }
  }

  if (values.briefReason.length > appointmentConfig.briefReasonMaxLength) {
    errors.briefReason = "Please shorten the note to 300 characters.";
  }

  if (!values.privacyAccepted) {
    errors.privacyAccepted = "Please confirm the privacy acknowledgement.";
  }

  return errors;
}
