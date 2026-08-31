# O-B-P01 Production Key Vault & Secret Architecture

**Status:** Production Key Vault **CREATED**; secret **values** operator-owned  
**Date:** 2026-08-31  
**Baseline HEAD:** `7974175`  
**ManagedBy:** O-B-P01  

```text
SECRET MANAGER (PRODUCTION) = Azure Key Vault
VAULT = kv-dr-vandana-prod
SEPARATE FROM = kv-dr-vandana-staging
VALUES IN THIS DOCUMENT = NEVER
```

---

## 1. Purpose

Define the Production secret-management architecture for Option B:

- Azure Key Vault as system of record for Production secrets  
- Strict separation from staging  
- Mapping of repository environment variables → Key Vault names / Vercel / ACA worker  
- Cursor vs operator boundaries  

Does **not** enable registration, WhatsApp, Option C, or provision the Production worker.

---

## 2. Azure targets (verified)

| Item | Value |
| --- | --- |
| Subscription | Confirmed via `az account show` (id present; not printed as secret) |
| Resource group | `rg-dr-vandana-prod` |
| Region | India South Central (`indiasouthcentral`) |
| Production PG | `pg-dr-vandana-prod` (not modified by O-B-P01) |
| Production Vercel project | `drvandana-psychology` |
| Staging vault (untouched) | `kv-dr-vandana-staging` |

Note: RG tag `Environment=Development` remains a known metadata mismatch (P1 from master readiness). Vault tags use `Environment=Production`.

---

## 3. Production Key Vault

| Property | Value |
| --- | --- |
| Name | `kv-dr-vandana-prod` |
| Resource group | `rg-dr-vandana-prod` |
| Location | India South Central |
| SKU | Standard |
| URI host | `kv-dr-vandana-prod.vault.azure.net` |
| Authorization | **Azure RBAC** (`enableRbacAuthorization=true`) |
| Soft delete | **Enabled** (retention 90 days) |
| Purge protection | **Enabled** |
| Public network | Enabled (tighten later if private endpoints approved) |
| Tags | Environment=Production, Application=DrVandana, Component=SecretManager, ManagedBy=O-B-P01 |

**Created by O-B-P01** (did not exist before).

---

## 4. Naming convention

Logical (ceremony):

```text
production/app/{kebab-purpose}
```

Physical Azure Key Vault names (no `/`):

```text
production-app-{kebab-purpose}
```

Aligned with staging pattern `staging-app-*` from O-B-05A / O-B-03 naming ceremony. **Never reuse staging secret names or values.**

---

## 5. RBAC / least privilege

| Principal | Role | Scope | Purpose |
| --- | --- | --- | --- |
| Signed-in operator (human) | Key Vault Secrets Officer | `kv-dr-vandana-prod` | Enter/rotate secret **values** via Portal/CLI |
| Future: `id-dr-vandana-prod-worker` (UAMI) | Key Vault Secrets User | vault only | Read secrets at Job runtime — **PLAN only; identity NOT created in O-B-P01** |
| Vercel | No Azure MI assumed | — | Operator copies allowed secrets into Vercel Production env (or future approved sync) |
| Application identities | Must **not** receive Owner/Contributor / Keys Officer / purge rights | — | Read-only Secrets User when MI exists |

Do **not** grant secret delete / vault admin to the worker or web app identities.

---

## 6. Managed Identity plan

### A. Vercel application

Vercel does **not** natively attach Azure Managed Identity in the current architecture.  
**Integration:** Operator sets Production env vars in Vercel from values stored in Key Vault (manual or approved sync). Do not invent a custom MI bridge in this task.

### B. Production ACA worker (future)

| Item | Plan |
| --- | --- |
| Name | `id-dr-vandana-prod-worker` |
| Type | User-assigned managed identity |
| Region | Prefer worker stack region (may be Central India if ACA unavailable in ISC) |
| KV role | Key Vault Secrets User on `kv-dr-vandana-prod` |
| ACR | AcrPull on Production registry (future) |
| Create in O-B-P01? | **NO** |

---

## 7. Cursor vs operator boundary

| Cursor / automation MAY | Cursor MUST NOT | Operator SHOULD |
| --- | --- | --- |
| Inspect names, config, RBAC metadata | Receive or print secret values | Enter values in Azure Portal Key Vault |
| Create vault / assign RBAC | Commit secrets / `.env` with values | Generate crypto secrets offline (`openssl rand`, etc.) |
| Document inventories | Put secrets in chat, docs, Git, logs, CLI args echoed | Configure Vercel Production secrets in dashboard |
| Verify presence (name exists) | Reuse staging values | Use Production Twilio / SMTP / PG consoles |

---

## 8. Consumers

| Consumer | Role |
| --- | --- |
| Vercel Production (`drvandana-psychology`) | Next.js App Router — identity, appointments UI, SMTP for enquiry/identity, OTP, MFA |
| Future ACA Job | `notifications:process` batch-and-exit — DB + SMTP + flags; not Q&A portal secrets |
| Operator CLIs | migrate / verify / gates — using operator machine env pulled from KV, never committed |

---

## 9. Secret value status

Azure Key Vault requires a value at secret creation. O-B-P01 does **not** invent placeholder credentials.

```text
ALL PRODUCTION SECRET VALUES = VALUE REQUIRED — OPERATOR MUST ENTER
```

Recommended operator entry order (names only):

1. `production-app-database-url`  
2. `production-app-auth-session-secret`  
3. `production-app-mfa-encryption-key`  
4. SMTP password + related SMTP metadata  
5. Twilio OTP (when Production OTP authorized)  
6. Upstash / Q&A / AI as needed  

Do **not** copy from `staging-app-*`.

---

## 10. Generation guidance (no values)

| Secret | Method (operator) |
| --- | --- |
| `AUTH_SESSION_SECRET` | Cryptographically random; **≥ 32 characters** (`isSessionSecretUsable`) |
| `MFA_ENCRYPTION_KEY` | 32-byte key material accepted by `decodeMfaKey` / `isMfaKeyUsable` (see `src/lib/identity/crypto.ts`) — generate securely offline |
| `DATABASE_URL` | Azure PG Production connection string targeting **`pg-dr-vandana-prod`** only; TLS required |
| `SMTP_PASSWORD` | Production mailbox App Password / provider credential — not staging |
| `TWILIO_AUTH_TOKEN` | Twilio **Production** console — not test/sandbox-as-prod |
| `SESSION_SECRET` (Q&A) | Distinct random secret ≠ `AUTH_SESSION_SECRET` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Production database token |

---

## 11. Feature flags (Production initial)

| Variable | Required Production value |
| --- | --- |
| `PATIENT_REGISTRATION_ENABLED` | `false` |
| `TWILIO_WHATSAPP_ENABLED` | `false` |
| `IDENTITY_PROVISION_ENABLED` | `false` |
| `SYNTHETIC_PATIENT_PROVISION_ENABLED` | `false` (never Production) |

Prefer storing flags in **Vercel** as non-secret config (and optionally mirror non-secret strings in KV for ops consistency).

---

## 12. APP_BASE_URL

| Item | Value |
| --- | --- |
| Repository default (`src/config/site.ts`) | `https://drvandana.trinetra.net` |
| Production Vercel project linkage | `drvandana-psychology` |
| Live HTTPS probe (prior prep) | NOT VERIFIED from operator network |
| Status | **OPERATOR VERIFICATION REQUIRED** — set `APP_BASE_URL` to the verified Production HTTPS origin |

`VERCEL_ENV` is system-provided by Vercel — do not duplicate as a Key Vault secret.

---

## 13. Worker vs web secret split

| Class | Examples | Web | Worker |
| --- | --- | --- | --- |
| BOTH | `DATABASE_URL`, SMTP_*, `EMAIL_PROVIDER`, registration/WhatsApp flags, `AUTH_SESSION_SECRET` (identity context bootstrap) | YES | YES |
| WEB ONLY | `MFA_ENCRYPTION_KEY`, OTP/Twilio SMS, Q&A `SESSION_SECRET` / psychologist hash, AI keys, Upstash (app rate limits), `APP_BASE_URL` | YES | NO (unless later proven) |
| WORKER ONLY | Notification tunables if different from web | — | Prefer same defaults unless split later |
| NEVER to worker | Production Owner credentials, clinical (N/A), staging secrets | — | — |

`AUTH_SESSION_SECRET` is required by `createAppIdentityContext()` used by `notifications:process` — hence BOTH.

---

## 14. Rotation

| Topic | Policy |
| --- | --- |
| Versioning | Azure secret versions retained; do not purge prior versions casually |
| Rotation period | **NOT YET DECIDED** (governance) |
| On exposure | Rotate immediately; redeploy Vercel / refresh worker secret refs |
| Staging | Independent rotation — never promote staging material |

---

## 15. Out of scope (separate tasks)

| Item | Task |
| --- | --- |
| Prod PG extensions / schema / firewall | O-B-P02 |
| Vercel secret insertion | Operator / later authorized task |
| Production ACA Job | Later worker provision task |
| SMTP/Twilio credential creation | Provider consoles |
| Registration enablement | Separate final authorization |

---

## 16. Related documents

- `docs/O_B_P01_PRODUCTION_ENVIRONMENT_VARIABLE_INVENTORY.md`  
- `docs/O_B_P01_PRODUCTION_KEY_VAULT_SECRET_ARCHITECTURE_REPORT.md`  
- Staging precedent: `docs/O_B_05A_STAGING_SECRET_MANAGER_CONFIGURATION_REPORT.md`  
