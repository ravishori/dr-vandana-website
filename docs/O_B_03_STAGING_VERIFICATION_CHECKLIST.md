# O-B-03 Staging Verification Checklist & Test Matrix

**Document type:** Verification plan (tests not executed in O-B-03)  
**Date:** 2026-08-30  
**Baseline:** `7974175`  
**Default status for all rows:** `NOT RUN`

```text
Do not claim PASS unless actually executed under a later authorization.
PATIENT_REGISTRATION_ENABLED must remain false for default matrix.
```

---

## A. Production isolation (must remain true)

| Check | Status in O-B-03 |
| --- | --- |
| No Production credentials used | NOT ACCESSED |
| No Production database | NOT ACCESSED |
| No Production secret manager | NOT ACCESSED |
| No Production DNS | NOT ACCESSED |
| No Production SMTP | NOT ACCESSED |
| No Production OTP provider | NOT ACCESSED |
| No Production worker | NOT ACCESSED |
| No Production backups | NOT ACCESSED |
| No Production patient data | NOT ACCESSED |
| No registration enablement | NOT PERFORMED |
| No clinical schema/API/UI/AI | NOT PERFORMED |

---

## B. Staging test matrix

| ID | Objective | Precondition | Action | Expected | Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ST-A01 | App boots | Staging deploy | Hit public homepage | 200 / renders | Screenshot/logs | Ops | NOT RUN |
| ST-B01 | Env validation | Secrets injected | `npm run production:gates` / identity gates against staging env | Registration false; blockers classified | Gate output (no secrets) | Ops | NOT RUN |
| ST-C01 | DB connectivity | Staging `DATABASE_URL` | App/db ping or migrate dry | Connects via TLS | Logs | Ops | NOT RUN |
| ST-D01 | Schema verification | Migrated staging DB | `npm run db:verify-production` | SCHEMA PASS | Output | Ops | NOT RUN |
| ST-E01 | btree_gist | Same | Included in verify | Present | Output | Ops | NOT RUN |
| ST-F01 | Exclusion constraint | Same | Included in verify | `appointments_blocking_occupied_excl` | Output | Ops | NOT RUN |
| ST-G01 | Authentication | Staging users (fixtures) | Login/logout psychologist/patient paths | Sessions work; revoke works | Logs | Security | NOT RUN |
| ST-H01 | OTP | Twilio staging + test number | Request/verify OTP on pending user | Codes deliver; replay denied | Provider logs (no codes in app logs) | Ops | NOT RUN |
| ST-I01 | MFA | Privileged staging user | TOTP enroll/login | MFA enforced | Logs | Security | NOT RUN |
| ST-J01 | Patient isolation | Two patient fixtures | Cross-access attempt | Deny / NOT_FOUND | Test log | Security | NOT RUN |
| ST-K01 | Psychologist isolation | Two psych fixtures | Cross-patient access | Deny | Test log | Security | NOT RUN |
| ST-L01 | SUPER_ADMIN boundary | SA fixture | Appointment/clinical-like access | No clinical; no appointment operate | Test log | Security | NOT RUN |
| ST-M01 | Appointment authz | Patient/psych | Book/lifecycle | Ownership enforced | Test log | Ops | NOT RUN |
| ST-N01 | Appointment concurrency | Staging PG | Overlap booking | One wins; exclusion holds | Test log | Ops | NOT RUN |
| ST-O01 | Notification outbox | Appointment mutation | Row in outbox | Written with commit | DB query (ops) | Ops | NOT RUN |
| ST-P01 | Worker | Staging worker | Process batch | SENT/RETRY/DEAD as expected | Worker logs | Ops | NOT RUN |
| ST-Q01 | SMTP | Test mailbox | Trigger verification or appointment email | Delivered to operator inbox only | Inbox | Ops | NOT RUN |
| ST-R01 | Audit/security | Auth/reg attempts | Inspect tables | Lean events; no secrets/OTP bodies | Query | Security | NOT RUN |
| ST-S01 | Registration disabled | Flag false | Open `/patient/register` | “not available” UI | Screenshot | Ops | NOT RUN |
| ST-T01 | Registration bypass | Flag false | Invoke `registerPatientAction` / domain path | NOT_ENABLED / notConfigured; **no user row** | Logs + DB count | Security | NOT RUN |
| ST-U01 | Health | Deployed | Host health / public site | Reachable | Probe | Ops | NOT RUN |
| ST-V01 | HTTPS/cookies | Staging HTTPS | Inspect Set-Cookie | Secure; HttpOnly; SameSite | DevTools | Security | NOT RUN |
| ST-W01 | Backup/restore | Staging backup | Restore to disposable DB | Schema verify PASS | Drill log | Ops | NOT RUN |
| ST-X01 | Rollback | Prior deploy artifact | Redeploy previous build | App healthy; flag still false | Deploy log | Ops | NOT RUN |
| ST-Y01 | Secrets non-disclosure | Any failure | Review logs/errors | No passwords/OTP/keys | Log sample redacted | Security | NOT RUN |

---

## C. Registration-disabled verification (mandatory)

```text
PATIENT_REGISTRATION_ENABLED=false
```

Expected:

- Registration page unavailable or disabled messaging  
- Server action rejected  
- `registerPatient` → `NOT_ENABLED` when flag false  
- No user/patient created  
- No verification email generated for new registration  
- Client cannot bypass (O-B-00)  

---

## D. Ideal staging CI sequence (plan)

```text
CHECKOUT → INSTALL → TYPECHECK → LINT → TEST → BUILD
→ DEPLOY STAGING → MIGRATE STAGING → VERIFY SCHEMA
→ SMOKE TEST → SECURITY TEST → APPROVE → HOLD
```

Production must **not** be in this pipeline for O-B-03.

---

## Document control

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-08-30 | Matrix only — NOT RUN |
