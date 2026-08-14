# OTP Provider Decision Pack

**Status:** HUMAN DECISION REQUIRED (O4)  
**PRODUCTION OTP: BLOCKED**  
**Date:** 14 August 2026  

Production must remain **fail-closed**. There is **no** production vendor adapter (`OTP_VENDOR_ADAPTER_IMPLEMENTED=false`). Do not activate a provider. Do not add credentials. Do not implement a vendor-specific adapter until a vendor is **approved**.

`OTP_*` environment variables are **not** production readiness.

This is not legal advice.

---

## Current code behaviour

```text
Production
  → real OTP provider required
  → missing / test / mock / unimplemented adapter
  → fail closed (UNCONFIGURED)
```

- Test OTP is refused when `NODE_ENV=production`
- No hard-coded OTP
- No email-as-OTP MFA bypass
- Hashes stored; plaintext OTP is not retained in application tables
- IP rate-limit on verify runs before user lookup

---

## Requirements the owner must evaluate

| Requirement | Why | Status |
|---|---|---|
| India SMS delivery | Patient mobiles are Indian numbers in this practice | HUMAN DECISION |
| OTP API | HTTPS API; not a UI-only portal | HUMAN DECISION |
| Delivery reliability / latency | Activation depends on timely SMS | HUMAN DECISION — measure with vendor |
| Sender requirements | Sender ID / header as applicable | HUMAN DECISION |
| DLT (TRAI) | India commercial SMS commonly requires DLT registration, entity ID, template ID | HUMAN DECISION + operator process |
| Security | TLS, API keys in secret manager, no OTP in logs | CODE partial; provider OPEN |
| Data processing | Where OTP payloads and numbers are processed | LEGAL REVIEW (O18) |
| Retention | How long the vendor keeps numbers/messages | LEGAL REVIEW (O10) |
| Delivery reports | Needed for support without asking the patient to repeat the code | HUMAN DECISION |
| Rate limits | Provider-side plus application-side | HUMAN DECISION |
| Cost | Per-SMS / OTP — **REQUIRES VERIFICATION**, not recorded here | HUMAN DECISION |
| Contract / DPA | Processor terms | LEGAL REVIEW |

---

## Options (classes, not a shortlist winner)

Do **not** treat the following as a selection. They are classes of option the owner may evaluate:

| Option | Notes |
|---|---|
| India-focused SMS/OTP API (DLT-aware) | Often the most direct fit for TRAI/DLT sender templates |
| Global CPaaS SMS (including Twilio SMS, if ever considered separately from WhatsApp) | Still needs India delivery + DLT reality |
| Hyperscaler SMS (e.g. regional SNS equivalents) | Confirm India delivery and sender IDs |
| Stay fail-closed | Current production state; registration cannot complete mobile verify |

**No vendor is recommended as the winner.** Technical recommendation only:

- Keep the provider-agnostic `OtpDeliveryProvider` boundary.
- Implement **one** adapter after approval.
- Keep test/mock providers impossible in production.
- Confirm DLT/template IDs **before** enabling registration.

---

## Information the owner must supply after choosing

1. Legal entity name on the SMS/DLT registration  
2. Vendor name and DPA  
3. Processing locations  
4. Sender ID / header  
5. DLT entity and template IDs (if applicable)  
6. Expected delivery SLA  
7. Retention and logging policy  
8. Secret storage location (not the secret)  
9. Who operates delivery-failure support  

---

## Explicit non-actions

- Do not put `OTP_API_KEY` in Git or `NEXT_PUBLIC_*`
- Do not enable registration to “try SMS”
- Do not log OTP codes
- Do not email the OTP as an MFA bypass
