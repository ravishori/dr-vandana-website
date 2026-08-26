export type ConfigOption<T extends string = string> = {
  value: T;
  label: string;
  enabled: boolean;
};

export type AgeGroupValue =
  | "child_adolescent_parent"
  | "18_25"
  | "26_40"
  | "41_60"
  | "60_plus"
  | "prefer_not_to_say";

export type ConsultationModeValue = "in_person" | "online" | "either";

export type ContactMethodValue = "phone" | "whatsapp" | "email";

export type PreferredDayValue =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"
  | "no_preference";

export type PreferredTimeValue =
  | "morning"
  | "afternoon"
  | "evening"
  | "no_preference";

export type AppointmentFormValues = {
  fullName: string;
  ageGroup: AgeGroupValue | "";
  consultationMode: ConsultationModeValue | "";
  contactMethod: ContactMethodValue | "";
  contactValue: string;
  preferredDay: PreferredDayValue | "";
  preferredTime: PreferredTimeValue | "";
  briefReason: string;
  privacyAccepted: boolean;
};

/**
 * Payload accepted by the Server Action.
 * `website` is a honeypot field — not part of the enquiry domain model.
 */
export type AppointmentEnquirySubmission = AppointmentFormValues & {
  website?: string;
};

export type AppointmentFormErrors = Partial<
  Record<keyof AppointmentFormValues, string>
>;

/**
 * Structured Server Action result for appointment enquiry submission.
 * Success means the validated enquiry was accepted by the email provider
 * for delivery to the configured practice inbox — not that an appointment
 * was booked or a consultation time was confirmed.
 */
export type AppointmentActionResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof AppointmentFormValues, string[]>>;
    };
