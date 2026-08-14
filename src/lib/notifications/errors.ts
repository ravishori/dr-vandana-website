export type ProviderErrorCategory = "TRANSIENT" | "PERMANENT";

export type NotificationErrorCode =
  | "TIMEOUT"
  | "CONNECTION_FAILURE"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "PROVIDER_5XX"
  | "INVALID_RECIPIENT"
  | "INVALID_TEMPLATE"
  | "MISSING_TEMPLATE"
  | "MISSING_VARIABLE"
  | "AUTHENTICATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "INVALID_REQUEST"
  | "EMAIL_NOT_CONFIGURED"
  | "EMAIL_UNVERIFIED"
  | "EMAIL_PROVIDER_FORBIDDEN"
  | "WHATSAPP_NOT_CONFIGURED"
  | "WHATSAPP_DISABLED"
  | "WHATSAPP_OPT_IN_MISSING"
  | "WHATSAPP_PROVIDER_FORBIDDEN"
  | "WHATSAPP_SANDBOX_FORBIDDEN"
  | "POLICY_SKIPPED"
  | "PERMANENT_PROVIDER_ERROR";

export type NotificationSendResult =
  | { ok: true; providerMessageId?: string }
  | {
      ok: false;
      category: ProviderErrorCategory;
      code: NotificationErrorCode;
    };

export function isTransientNotificationError(
  result: NotificationSendResult,
): boolean {
  return !result.ok && result.category === "TRANSIENT";
}

export function classifyHttpStatus(
  status: number,
): Pick<Extract<NotificationSendResult, { ok: false }>, "category" | "code"> {
  if (status === 429) {
    return { category: "TRANSIENT", code: "RATE_LIMITED" };
  }
  if (status >= 500) {
    return { category: "TRANSIENT", code: "PROVIDER_5XX" };
  }
  if (status === 401 || status === 403) {
    return { category: "PERMANENT", code: "AUTHENTICATION_ERROR" };
  }
  if (status >= 400) {
    return { category: "PERMANENT", code: "INVALID_REQUEST" };
  }
  return { category: "TRANSIENT", code: "PROVIDER_UNAVAILABLE" };
}
