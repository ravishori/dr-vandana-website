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

export type AppointmentFormErrors = Partial<
  Record<keyof AppointmentFormValues, string>
>;
