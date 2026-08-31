# O-B-03 Staging Infrastructure Provisioning Plan

**Document type:** Staging blueprint (plan only — not executed)  
**Date:** 2026-08-30  
**Baseline:** `7974175`  
**Companions:**  
`docs/O_B_03_STAGING_SECRET_MANAGER_NAMING_CEREMONY.md`  
`docs/O_B_03_STAGING_VERIFICATION_CHECKLIST.md`  
`docs/O_B_03_STAGING_ROLLBACK_RUNBOOK.md`  
`docs/O_B_03_STAGING_INFRASTRUCTURE_READINESS_REPORT.md`  
**Related:** `docs/STAGING_ENVIRONMENT_RUNBOOK.md`, O-B-00…O-B-02

```text
THIS IS A PLAN. DO NOT EXECUTE AUTOMATICALLY.
Production: NOT ACCESSED
PATIENT_REGISTRATION_ENABLED: must remain false (staging default)
Option C: BLOCKED
```

---

## 1. Purpose

Provide an auditable staging deployment blueprint for Option B (identity, appointments, notifications, educational AI, crisis resources, Q&A) with:

- environment separation  
- secret-manager naming contract  
- verification sequence  
- rollback  
- registration-disabled enforcement  
- no clinical / Option C pathways  

---

## 2. Provider selection status

| Layer | Repository evidence | Status |
| --- | --- | --- |
| App hosting | Next.js / Vercel-style compatible (decisions) | **DECISION REQUIRED** for staging host SKU |
| PostgreSQL | APPROVED engine; vendor O1 **OPEN** | **DECISION REQUIRED** |
| Region / residency | O2 / O18 OPEN | **DECISION REQUIRED** / **LEGAL REVIEW REQUIRED** if non-India |
| Secret manager | Host secret store required; product unset | **DECISION REQUIRED** |
| SMTP | Nodemailer; vendor OPEN | **DECISION REQUIRED** |
| OTP | Twilio SMS adapter implemented; config OPEN | **DECISION REQUIRED** (use Twilio SMS vs other) |
| Worker hosting O15 | OPEN | **DECISION REQUIRED** |
| Monitoring | OPEN | **DECISION REQUIRED** |
| Staging hostname | Not registered in this task | **DECISION REQUIRED** (e.g. `staging.<approved-domain>`) |

Do **not** treat Vercel/Neon/etc. as selected. Evidence of compatibility ≠ selection.

---

## 3. Environment separation

| Concern | LOCAL | STAGING | PRODUCTION |
| --- | --- | --- | --- |
| `DATABASE_URL` | Dev/test only | **Separate** staging DB | Separate Prod DB |
| Secret namespace | `.env.local` (gitignored) | `staging/app/*` | `production/app/*` |
| SMTP | Dev mailbox | Operator/test mailbox only | Prod sender |
| OTP | Test/mock forbidden in Prod; staging: sandbox/test numbers only | Never real patients | Prod DLT/sender |
| Session / MFA secrets | Distinct | Distinct | Distinct |
| `APP_BASE_URL` | localhost or local tunnel | Staging HTTPS URL | Prod URL |
| Worker | Optional CLI (non-prod) | Staging entrypoint | Prod entrypoint (not `notifications:process`) |
| `PATIENT_REGISTRATION_ENABLED` | false default | **false default** | **false until all gates** |
| WhatsApp | Prefer disabled | Prefer disabled / sandbox labelled | Disabled until checklist |
| Patient data | Fixtures only | No Prod dumps | Real patients only after go-live |

**Hard rules:** No staging↔Production secret, DB, or worker cross-wiring.

---

## 4. Staging architecture (proposed)

```text
[ Staging HTTPS hostname ]
        │
        ▼
[ Next.js App Host — DECISION REQUIRED ]
        │
        ├── DATABASE_URL ──► [ Staging PostgreSQL 16+ — DECISION REQUIRED ]
        │                         btree_gist + exclusion verified
        ├── AUTH_SESSION_SECRET / MFA_ENCRYPTION_KEY
        ├── SMTP_* ──► [ Test mailbox / relay — DECISION REQUIRED ]
        ├── OTP Twilio SMS ──► [ Sandbox / verified test numbers only ]
        ├── (optional) Upstash staging Redis for rate limits
        ├── Worker process / cron — DECISION REQUIRED (O15 pattern)
        └── Logs / optional ERROR_NOTIFY_EMAIL → operators only
```

Q&A / crisis SQLite or Upstash remain **non-PMS** stores; still use staging-isolated credentials if cloud-backed.

Educational Ask AI: optional staging key; never `NEXT_PUBLIC_`.

---

## 5. External dependency matrix

| Dependency | Required for staging smoke? | Required for staging registration test? | Status |
| --- | --- | --- | --- |
| Staging Postgres | YES | YES | NOT CONFIGURED |
| Secret manager | YES | YES | DECISION REQUIRED |
| SMTP | YES (auth email paths) | YES | NOT CONFIGURED |
| OTP SMS | For phone verify path | YES if testing full activate | NOT CONFIGURED |
| Worker | YES if testing outbox drain | Optional for reg-only | NOT READY (hosting) |
| Upstash | Recommended for rate limits | Recommended | OPTIONAL |
| WhatsApp | NO (keep false) | NO | Keep disabled |
| AI key | NO for core PMS smoke | NO | OPTIONAL |
| DNS/TLS staging host | YES for cookie/HTTPS verify | YES | DECISION REQUIRED |
| Backups | YES for restore drill | — | NOT CONFIGURED |

---

## 6. Operator runbook (PLAN — do not auto-execute)

### PHASE 0 — Safety gate

- Confirm HEAD / branch  
- Confirm Production not targeted  
- Confirm `PATIENT_REGISTRATION_ENABLED=false`  
- Confirm no Prod secrets in env  
- Confirm Option C not in scope  

### PHASE 1 — Provider selection

- Record written choices for host, Postgres, SMTP, OTP, worker, monitoring, hostname  
- Status until signed: **DECISION REQUIRED**

### PHASE 2 — Resource naming

- Apply secret naming ceremony (`docs/O_B_03_STAGING_SECRET_MANAGER_NAMING_CEREMONY.md`)  
- Name staging DB project, app project, worker service distinctly from Production  

### PHASE 3 — Secret manager setup

- Create empty secret **names** only; inject values offline by owner  
- Never commit values  

### PHASE 4 — Database setup

- Provision Postgres 16+  
- Enable `btree_gist`  
- Store `DATABASE_URL` in staging secret only  
- Do not use Production DB  

### PHASE 5 — Application configuration

- Inject non-secrets: `APP_BASE_URL`, flags false, `EMAIL_PROVIDER=smtp`  
- Inject secrets from ceremony map  

### PHASE 6 — SMTP / OTP setup

- Configure test mailbox; whitelist operator addresses  
- Configure Twilio SMS for **verified test numbers** only  
- Keep `TWILIO_WHATSAPP_ENABLED=false`  

### PHASE 7 — Worker setup

- Deploy non-CLI production-style entrypoint for **staging** (O15 decision)  
- Point only at staging DB  

### PHASE 8 — HTTPS / DNS preparation

- Create staging DNS + certificate (**separate authorization** to change DNS)  
- Verify Secure cookies over HTTPS  

### PHASE 9 — Deployment

- Deploy app build to staging host  
- No Production deploy  

### PHASE 10 — Schema verification

- `APPLY_IDENTITY_MIGRATION=true npm run db:migrate` against staging only  
- `npm run db:verify-production` against staging `DATABASE_URL`  

### PHASE 11 — Functional smoke tests

- Run matrix in verification checklist (registration stays false)  

### PHASE 12 — Security tests

- Registration bypass attempt; isolation; header/cookie checks  

### PHASE 13 — Backup / restore test

- Backup staging DB; restore to disposable copy; re-verify schema  

### PHASE 14 — Rollback test

- Follow `docs/O_B_03_STAGING_ROLLBACK_RUNBOOK.md`  

### PHASE 15 — Staging sign-off

- Human sign-off checklist; still **no** Production go-live; still **no** registration enable unless separately authorized for controlled staging experiment  

---

## 7. Registration safety (binding)

```text
STAGING DEFAULT:
PATIENT_REGISTRATION_ENABLED=false

PRODUCTION DEFAULT:
PATIENT_REGISTRATION_ENABLED=false until all approved release gates are satisfied.
```

Authoritative denial: `registerPatient` → `NOT_ENABLED`; public `isRegistrationAvailable()`. Client cannot set server env (O-B-00 **CONFIRMED**).

Optional controlled staging registration remains **NOT AUTHORIZED** in O-B-03 (see existing `STAGING_ENVIRONMENT_RUNBOOK.md` for future human-gated exception).

---

## 8. Option B / Option C boundary

**Option B in staging:** auth, MFA, accounts (disabled reg), appointments, notifications, audit, educational Ask, crisis resources, Q&A.

**Option C:** BLOCKED — no clinical schemas/APIs/UI/AI/messaging/assessments/safety detectors/break-glass.

---

## 9. Cost / resource control

Likely resource types: managed Postgres, app host, optional Redis, SMTP mailbox, Twilio trial, worker compute, staging DNS.

```text
PRICING VERIFICATION REQUIRED
```

Do not claim free-tier adequacy without vendor confirmation.

---

## 10. Legal / governance boundary

O-B-03 does **not** resolve O10, O11, clinical consent, F4 GDs, minors, clinical AI, etc.

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | Plan only — not executed |
