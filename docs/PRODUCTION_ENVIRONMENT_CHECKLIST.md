# Production Environment Checklist

**Status:** Preparation only. **PRODUCTION BLOCKED.**  
No secrets belong in this file or in Git.

Every row is **CODE**, **CONFIGURATION**, **INFRASTRUCTURE**, **PROVIDER**, **LEGAL**, **HUMAN DECISION**, or **SECURITY REVIEW**.

A gate is not PASS merely because code, docs, mocks, or an environment variable exist.

| Area | Item | Category | Current status |
|---|---|---|---|
| DATABASE | Vendor (O1) | HUMAN DECISION | BLOCKED |
| DATABASE | Region / version / pooling / TLS (O2) | HUMAN DECISION + CONFIGURATION | BLOCKED |
| DATABASE | `DATABASE_URL` in host secret store | CONFIGURATION | NOT CONFIGURED for production |
| DATABASE | `btree_gist` + exclusion constraint | INFRASTRUCTURE | Verify with `db:verify-production` on the **target** DB |
| SMTP | Host, port, TLS, auth, from address | CONFIGURATION | NOT CONFIGURED for production |
| SMTP | Reply-to | HUMAN DECISION | OPEN |
| SMTP | SPF / DKIM / DMARC | CONFIGURATION | Not changed in this phase |
| SMTP | Bounce handling / monitoring | HUMAN DECISION + CONFIGURATION | OPEN |
| OTP | Vendor (O4) | HUMAN DECISION + PROVIDER | BLOCKED; adapter unimplemented |
| OTP | `OTP_API_KEY` | CONFIGURATION | Must remain fail-closed until adapter exists |
| TWILIO | Account, WhatsApp sender, Content SIDs | PROVIDER | BLOCKED; `TWILIO_WHATSAPP_ENABLED=false` |
| AUTH | `AUTH_SESSION_SECRET` | CONFIGURATION | Host secret store only |
| MFA | `MFA_ENCRYPTION_KEY` | CONFIGURATION | 32-byte key; rotation procedure OPEN |
| MFA | Recovery policy (O12) | HUMAN DECISION | OPEN; backup codes only |
| WORKER | Hosting (O15) | HUMAN DECISION | OPEN; CLI refuses production |
| MONITORING | APM / alerts | CONFIGURATION | BLOCKED; none selected |
| BACKUPS | Automated backups + encryption | INFRASTRUCTURE | BLOCKED |
| DNS | No identity DNS change in this phase | CONFIGURATION | Do not modify from this milestone |
| TLS | Site already HTTPS; DB/SMTP/OTP TLS required | CONFIGURATION | Verify after vendors exist |
| SECRETS | Host secret manager; never Git / `NEXT_PUBLIC_*` | CONFIGURATION | See secret policy below |
| CI/CD | GitHub Actions verify + PG job | CODE | IMPLEMENTED; not a production deploy pipeline |

---

## Secret policy

Secrets must live in the **host secret manager**.

Never store secrets in:

- Git
- the database
- a Super Admin dashboard (not implemented)
- the client bundle
- `NEXT_PUBLIC_*`
- logs

Names only (no values):

`DATABASE_URL`, `AUTH_SESSION_SECRET`, `MFA_ENCRYPTION_KEY`, `OTP_API_KEY`, `SMTP_PASSWORD`, `SMTP_USER`, `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID`, `SESSION_SECRET` (question portal), `PSYCHOLOGIST_PASSWORD_HASH`, `AI_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`

Rotation intervals: **OPEN HUMAN DECISION**. After `AUTH_SESSION_SECRET` rotation, existing practice sessions become invalid. After `MFA_ENCRYPTION_KEY` rotation, stored TOTP secrets will not decrypt unless a planned re-encryption exists — **do not rotate casually**.

---

## SMTP production preparation (do not configure here)

Required: host, port (465 implicit TLS or 587 STARTTLS), authentication, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`. Reply-to **OPEN**. SPF/DKIM/DMARC **REQUIRES CONFIGURATION** in DNS after a sender is chosen. Bounce handling **OPEN**. Production `EMAIL_PROVIDER=test|mock` is refused.

---

## OTP production preparation (do not select a vendor)

Need: India mobile delivery, sender / DLT as applicable, HTTPS API auth, rate limits, no plaintext OTP retention beyond need, processor agreement **REQUIRES LEGAL REVIEW**, cost **OPEN**, failure/timeout handling. Production must remain fail-closed. `OTP_VENDOR_ADAPTER_IMPLEMENTED=false`.

---

## Twilio production preparation (do not configure here)

Need: production Twilio account (not sandbox-as-production), WhatsApp Business sender, Meta business requirements, approved Content Templates and SIDs, patient opt-in/opt-out, server-only credentials, delivery status monitoring. `TWILIO_WHATSAPP_ENABLED` must stay false until those exist.

Twilio / Meta data residency, subprocessors, retention, and cross-border transfers: **OPEN** — **REQUIRES HUMAN/LEGAL REVIEW**. No compliance claims.

---

## Operator commands (safe output)

```bash
npm run identity:gates
npm run production:gates
npm run db:verify-production
```
