# O-B-P04B Production Secret Inventory

**Document type:** Sanitized Production Key Vault inventory  
**Date:** 2026-08-31  
**Vault:** `kv-dr-vandana-prod`  
**Baseline HEAD:** `7974175`

```text
VALUE EXPOSED = NO (all rows)
STAGING REUSE = NO
```

---

## 1. Existing Production secrets (verified metadata)

| Secret | Key Vault | Status | Enabled | Last updated (UTC) | Required by | Value exposed |
| --- | --- | --- | --- | --- | --- | --- |
| `production-app-database-url` | `kv-dr-vandana-prod` | **PRESENT** | YES | 2026-08-31T04:37:23 | Web + Worker (`DATABASE_URL`) | NO |
| `production-app-auth-session-secret` | `kv-dr-vandana-prod` | **PRESENT** | YES | 2026-08-31T01:20:30 | Web + Worker (`AUTH_SESSION_SECRET`) | NO |
| `production-app-mfa-encryption-key` | `kv-dr-vandana-prod` | **PRESENT** | YES | 2026-08-31T01:20:32 | Web (`MFA_ENCRYPTION_KEY`) | NO |

### `production-app-database-url` safe metadata (password not shown)

| Field | Verified value |
| --- | --- |
| Hostname | `pg-dr-vandana-prod.postgres.database.azure.com` |
| Port | `5432` |
| Database | `dr_vandana_db` |
| TLS query | `sslmode=require` |
| Staging markers | **ABSENT** |

---

## 2. Required Production SMTP secrets (worker)

| Secret | Key Vault | Status | Required by | Value exposed |
| --- | --- | --- | --- | --- |
| `production-app-smtp-server` | `kv-dr-vandana-prod` | **MISSING** | Worker + Web (`SMTP_SERVER`) | NO |
| `production-app-smtp-port` | `kv-dr-vandana-prod` | **MISSING** | Worker + Web (`SMTP_PORT`) | NO |
| `production-app-smtp-username` | `kv-dr-vandana-prod` | **MISSING** | Worker + Web (`SMTP_EMAIL`) | NO |
| `production-app-smtp-password` | `kv-dr-vandana-prod` | **MISSING** | Worker + Web (`SMTP_PASSWORD`) | NO |
| `production-app-smtp-from-email` | `kv-dr-vandana-prod` | **MISSING** | Worker + Web (`SMTP_FROM_EMAIL`) | NO |
| `production-app-smtp-from-name` | `kv-dr-vandana-prod` | **MISSING** | Worker (`SMTP_FROM_NAME`, optional) | NO |

---

## 3. Non-KV worker configuration (O-B-P04C)

| Configuration | Storage | Status |
| --- | --- | --- |
| `NOTIFICATION_WORKER_EXECUTION_PROFILE=production-hosted-v1` | ACA Job plain env | **NOT DEPLOYED** |
| `NODE_ENV=production` | ACA Job env | **NOT DEPLOYED** |
| `EMAIL_PROVIDER=smtp` | ACA Job plain env | **NOT DEPLOYED** |
| `PATIENT_REGISTRATION_ENABLED=false` | ACA Job plain env | **NOT DEPLOYED** |
| `TWILIO_WHATSAPP_ENABLED=false` | ACA Job plain env | **NOT DEPLOYED** |

---

## 4. Staging reference (not copied)

Staging vault `kv-dr-vandana-staging` contains `staging-app-smtp-*` (6 secrets, all enabled). **No staging values were read, copied, or written to Production.**

| Staging secret | Production equivalent | Copied? |
| --- | --- | --- |
| `staging-app-smtp-server` | `production-app-smtp-server` | **NO** |
| `staging-app-smtp-port` | `production-app-smtp-port` | **NO** |
| `staging-app-smtp-username` | `production-app-smtp-username` | **NO** |
| `staging-app-smtp-password` | `production-app-smtp-password` | **NO** |
| `staging-app-smtp-from-email` | `production-app-smtp-from-email` | **NO** |
| `staging-app-smtp-from-name` | `production-app-smtp-from-name` | **NO** |

---

## 5. Value parity attestation

| Comparison | Result |
| --- | --- |
| Production vs Staging session secret | **NOT DIRECTLY VERIFIED** |
| Production vs Staging MFA key | **NOT DIRECTLY VERIFIED** |
| Production vs Staging SMTP | **N/A** — Production SMTP secrets **MISSING** |

No cryptographic hash comparison performed (no approved non-reversible verification mechanism invoked).

---

## 6. Key Vault changes in O-B-P04B

| Change type | Count |
| --- | --- |
| Secrets created | **0** |
| Secrets updated | **0** |
| Secrets deleted | **0** |
| Secrets rotated | **0** |

**Reason:** Production SMTP credentials require **OPERATOR SECRET INPUT** — not available to Cursor during this ceremony.

---

## 7. Total secret count

| Vault | Count (names) |
| --- | --- |
| `kv-dr-vandana-prod` (before O-B-P04B) | 3 |
| `kv-dr-vandana-prod` (after O-B-P04B) | **3** (unchanged) |
| Required for worker SMTP readiness | **+6** (pending operator) |
