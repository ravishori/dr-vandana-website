# O-B-05B Vercel Staging Configuration Inventory

**Document type:** Vercel staging/Preview inventory (names / statuses — **no secret values**)  
**Date:** 2026-08-30  
**Baseline:** `7974175`  
**Companion:** `docs/O_B_05B_VERCEL_STAGING_CONFIGURATION_REPORT.md`

```text
SECRET NAME EXISTS ≠ SECRET VALUE VERIFIED
Staging Vercel project for this task: dr-vandana-website (Preview)
Production project (untouched): drvandana-psychology
```

---

## Projects

| Project | Latest Production URL (metadata) | Role in O-B-05B |
| --- | --- | --- |
| `dr-vandana-website` | `https://drvandana.trinetralab.net` | **Staging/lab candidate** — Preview configured |
| `drvandana-psychology` | `https://drvandana.trinetra.net` | **Production-linked** — **NOT MODIFIED** |

Local `.vercel/project.json` currently links to `drvandana-psychology` (Production). Staging CLI operations must use `--project dr-vandana-website`. Relink decision: **DECISION REQUIRED**.

---

## Preview variable matrix (`dr-vandana-website`)

| Variable | Category | Staging required? | Source | Secret? | Current state | Action this task | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | Runtime flag | YES = `false` | Vercel Preview Config | NON-SECRET | **CONFIGURED** `false` | Set Preview Config `false` | **PASS** (`REG="false"`) |
| `IDENTITY_PROVISION_ENABLED` | Runtime flag | Prefer `false` | Vercel Preview Config | NON-SECRET | **CONFIGURED** `false` | Set Preview Config `false` | **PASS** |
| `TWILIO_WHATSAPP_ENABLED` | Channel flag | Prefer `false` | Vercel Preview Config | NON-SECRET | **CONFIGURED** `false` | Set Preview Config `false` | **PASS** |
| `EMAIL_PROVIDER` | Adapter mode | `smtp` | Vercel Preview Config | NON-SECRET | **CONFIGURED** `smtp` | Set Preview Config | **PASS** |
| `APP_BASE_URL` | Public/base URL | YES | Vercel Preview Config | NON-SECRET | **CONFIGURED** `https://drvandana.trinetralab.net` | Set Preview Config | **PASS** |
| `APPOINTMENT_RATE_LIMIT_STORE` | Store mode | Prefer `upstash` | Vercel Preview Config | NON-SECRET | Present (`upstash`) | None | **PASS** (readable) |
| `DATABASE_URL` | DB | YES | Vercel Preview **Secret** + intended KV `staging-app-database-url` | SECRET | Name **PRESENT**; value pull **blocked** by platform | None (no invent) | **NOT VERIFIED** target host via CLI |
| `AUTH_SESSION_SECRET` | Session | YES | Preview Secret / KV map | SECRET | Name **PRESENT**; pull blocked | None | **NOT VERIFIED** |
| `MFA_ENCRYPTION_KEY` | MFA | YES if MFA | Preview Secret / KV map | SECRET | Name **PRESENT**; pull blocked | None | **NOT VERIFIED** |
| `SMTP_*` | Email | For mail smoke | Preview Secret — **O-B-05C** | SECRET | Names present | **OUT OF SCOPE** | **NOT VERIFIED** |
| `TWILIO_*` OTP | OTP | For OTP smoke | Preview Secret — **O-B-05D** | SECRET | Names present | **OUT OF SCOPE** | **NOT VERIFIED** |
| `UPSTASH_REDIS_REST_*` | Rate limit | Recommended | Preview Secret | SECRET | Names present | None | **NOT VERIFIED** |
| Azure Key Vault secrets | SM | Preferred SoT | `kv-dr-vandana-staging` | SECRET | **0 secrets stored** | None | **NOT CONFIGURED** values |

---

## Azure Key Vault ↔ Vercel gap

```text
Approved SM: Azure Key Vault (staging)
Vercel Preview: stores its own Secret env vars
Direct Key Vault → Vercel sync: NOT CONFIGURED
STAGING APPLICATION IDENTITY REQUIRED (from O-B-05A)
```

Do not invent a new architecture. Future wiring must be explicit.

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | Preview config flags set; secrets not invented |
