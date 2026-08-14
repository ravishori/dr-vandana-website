# Twilio WhatsApp Production Checklist

**Status:** BLOCKED. Preferred provider direction: **Twilio** (already APPROVED as adapter direction). Production activation remains **OPEN** (O5).  
**Date:** 14 August 2026  

Do **not** switch WhatsApp BSP automatically. Do **not** add production credentials. Do **not** activate a production sender from this milestone.

`TWILIO_WHATSAPP_ENABLED` must remain **false** until every row below is genuinely complete.

Env var presence is **not** production readiness. Sandbox is **not** production.

---

## Current code behaviour

- `WhatsAppService` → `TwilioWhatsAppProvider`
- Production test/sandbox-as-production is refused
- Templates use Content SIDs (empty in `.env.example`)
- Patient WhatsApp opt-in defaults **off**; reversible; timestamps stored
- Appointment commit does not wait on Twilio
- Dispatcher CAS prevents SENT overwrite

Copy in WhatsApp bodies must remain non-clinical (no diagnosis, notes, assessments).

---

## Checklist (unsigned)

| Item | Requirement | STATUS | EVIDENCE | OWNER | DATE | SIGN-OFF |
|---|---|---|---|---|---|---|
| Twilio account | Production account (not sandbox-as-production) | OPEN | Account SID **name** only | HUMAN DECISION | | |
| WhatsApp Business sender | Approved sender on Twilio | OPEN | Sender status in Twilio console (no tokens) | HUMAN DECISION | | |
| Meta business requirements | Meta Business / WhatsApp Business account linkage as required by Twilio/Meta at the time | OPEN | Meta/Twilio approval record | HUMAN DECISION | | |
| Sender approval | Display name / number approved | OPEN | Approval screenshot without secrets | HUMAN DECISION | | |
| Content Templates | Appointment event templates approved | OPEN | Template names | HUMAN DECISION | | |
| Content SIDs | Mapped to env names in `.env.example` | NOT CONFIGURED | SIDs in secret store, not Git | HUMAN DECISION | | |
| Patient opt-in | Explicit, default off, appointment-related | CODE present; wording LEGAL REVIEW | Checkbox + timestamps | LEGAL REVIEW | | |
| Opt-out | Reversible in product; honour STOP/provider opt-out | OPEN | Process documented | HUMAN DECISION + LEGAL REVIEW | | |
| Delivery status | Webhooks or status polling for failures | OPEN | Monitoring | HUMAN DECISION | | |
| Failure handling | Retry/dead-letter already in dispatcher; ops alerting missing | CODE partial | Alert on DEAD | HUMAN DECISION | | |
| Credentials | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` in secret manager | NOT CONFIGURED | Secret names only | HUMAN DECISION | | |
| Monitoring | Failed sends, 401s, template rejects | OPEN | See monitoring checklist | HUMAN DECISION | | |
| Processor / residency | Twilio and Meta processing locations | OPEN | `docs/DECISION_DATA_RESIDENCY.md` | LEGAL REVIEW | | |
| `TWILIO_WHATSAPP_ENABLED` | Exact `"true"` only after this list | PASS (currently false) | `.env.example` | HUMAN DECISION | | |

---

## Legal / copy

Current checkbox (not approved legal text):

> I agree to receive appointment-related notifications from Dr. Vandana through WhatsApp.

Do not change this wording without approval. See `docs/LEGAL_REVIEW_REQUIRED.md`.

---

## Residual technical limits

- SMTP has no provider idempotency header; Twilio uses an idempotency token in the adapter.
- Duplicate WhatsApp is less likely than duplicate email, but Meta/Twilio still can fail after send.
- Do not implement bulk WhatsApp or marketing automation.

---

## Explicit non-actions

- No production sender activation
- No DNS change for WhatsApp
- No `NEXT_PUBLIC_TWILIO_*`
- No `wa.me` / Bitly substitute
