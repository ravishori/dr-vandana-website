# Production Monitoring Checklist

**Status:** Preparation only. **No monitoring provider is selected.** **PRODUCTION BLOCKED.**

Logs exist. Logs are not production monitoring.

Thresholds: **OPEN** unless already defined in code (rate-limit windows are application limits, not alert thresholds). Do not invent production alert numbers.

---

## Signals to monitor (once a provider exists)

| Area | What to watch | Category |
|---|---|---|
| Authentication | Login failures, rate-limit denials, disabled-account hits | CONFIGURATION |
| OTP | Send failures, verify failures, provider unconfigured | PROVIDER |
| MFA | Lockouts, replay rejects, missing encryption key | CONFIGURATION |
| Database | Connectivity, migration/verify failures, constraint errors | INFRASTRUCTURE |
| Appointments | Booking failures, `SLOT_UNAVAILABLE` spikes, stale CAS | CODE + CONFIGURATION |
| Booking conflicts | Exclusion violations (`23P01`), deadlocks (`40P01`) | INFRASTRUCTURE |
| Notification outbox | Backlog (`PENDING`/`RETRY` age), `DEAD` count | CONFIGURATION |
| Email | SMTP timeouts, `EMAIL_NOT_CONFIGURED`, bounce rate | PROVIDER |
| Twilio | HTTP failures, `WHATSAPP_DISABLED`, template errors | PROVIDER |
| Worker | Process down, lease expiry storms, batch duration | HUMAN DECISION (O15) |
| Application errors | Structured `ERROR` logs, `/api/internal/errors` | CONFIGURATION |

Existing optional `ERROR_NOTIFY_EMAIL` is process-local SMTP and is **not** globally distributed monitoring.

---

## Alerting (thresholds OPEN)

Document alerts for, without inventing numeric thresholds:

- authentication spikes
- OTP failure spikes
- booking failures
- database failures
- notification backlog
- dead notifications
- worker unavailable
- Twilio failures
- SMTP failures

Owner: **HUMAN DECISION**.

---

## Do not mark monitoring READY

Selecting a vendor, wiring dashboards, and proving pages in the **target** environment must happen before this gate is PASS.
