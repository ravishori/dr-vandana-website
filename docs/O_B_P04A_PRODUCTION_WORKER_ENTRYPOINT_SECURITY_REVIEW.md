# O-B-P04A Production Worker Entrypoint — Security Review

**Document type:** Security review  
**Date:** 2026-08-31  
**Reviewer:** Application agent (O-B-P04A)  
**Scope:** Production worker authorization boundary — application code only

---

## 1. Review scope

| Area | Files |
| --- | --- |
| Production guard | `src/lib/notifications/production-worker-guard.ts` |
| Production entrypoint | `scripts/process-notifications-production.ts` |
| Preserved staging guard | `scripts/process-notifications.ts` (unchanged) |
| Tests | `src/lib/notifications/production-worker-guard.test.ts` |

---

## 2. Threat model summary

| Threat | Mitigation | Status |
| --- | --- | --- |
| Production guard bypass via staging CLI | Existing `NODE_ENV` / `nodeEnv` checks unchanged | **MITIGATED** |
| Generic env bypass (`ALLOW_PRODUCTION_WORKER=true`) | Not introduced; fixed profile string required | **MITIGATED** |
| Vercel/web accidental worker execution | Rejects `VERCEL`, Lambda, Netlify markers | **MITIGATED** |
| HTTP-controlled authorization | No HTTP route; no header/query/cookie auth | **MITIGATED** |
| Staging → Production credential confusion | DB URL host/db + sslmode validation; staging host rejected | **MITIGATED** |
| Secret logging | Guard reasons never include URL credentials or env secret values; tests assert | **MITIGATED** |
| `NODE_ENV=development` Production workaround | Production entrypoint requires `NODE_ENV=production` | **MITIGATED** |
| Duplicate processing implementation | Reuses `processDueNotifications` only | **MITIGATED** |
| Long-running worker / uncontrolled subprocess | Script runs one batch and exits | **MITIGATED** |
| Registration / WhatsApp escalation | Explicit false checks on safety flags | **MITIGATED** |
| Privilege escalation via worker | Worker uses same identity context as existing batch processor; no new admin paths | **ACCEPTABLE** (unchanged from staging worker model) |

---

## 3. Authorization mechanism assessment

### `NOTIFICATION_WORKER_EXECUTION_PROFILE=production-hosted-v1`

**Assessment:** Acceptable operational binding when combined with:

- Dedicated script path (not the staging CLI).
- Production PostgreSQL target validation.
- Public platform rejection.
- `NODE_ENV=production` requirement.

**Residual risk:** Any process with Production secrets **and** the profile env var could invoke the script. Mitigation is operational: profile is injected only on ACA Job container (O-B-P04C), not on Vercel. This matches the approved architecture (Managed Identity + dedicated Job + dedicated entrypoint).

**Not acceptable alone:** Profile without DB target checks would be weak — **not** the implemented design.

---

## 4. Production guard bypass review

| Vector | Result |
| --- | --- |
| Set profile on `notifications:process` | Staging CLI still blocked at `nodeEnv=production` before processing |
| Set `NODE_ENV=development` on Production script | Blocked by guard (`NODE_ENV must be production`) |
| Omit profile on Production script | Blocked |
| Use staging `DATABASE_URL` with profile | Blocked (staging host/db) |
| Use local `DATABASE_URL` with profile | Blocked (wrong host) |

**Verdict:** No weakening of existing guard detected.

---

## 5. Secret leakage review

| Secret | Logged? | Evidence |
| --- | --- | --- |
| `DATABASE_URL` | NO | Failure reasons use generic host/db labels only |
| `SMTP_PASSWORD` | NO | Not referenced in guard messages; tests assert |
| `AUTH_SESSION_SECRET` | NO | Generic “requires AUTH_SESSION_SECRET” only |
| `MFA_ENCRYPTION_KEY` | NO | Not referenced in guard messages; tests assert |

Processing errors in `main().catch` use generic message: `"Production notification processing failed."`

---

## 6. Database fallback review

Production worker requires:

- Host matching `pg-dr-vandana-prod` (or subdomain thereof).
- Database name exactly `dr_vandana_db`.
- `sslmode=require`.

Staging host or `dr_vandana_db_staging` rejected. **No silent fallback.**

---

## 7. SMTP / email / WhatsApp / registration

| Control | State |
| --- | --- |
| SMTP configured in this task | NO |
| Email sent | NO |
| `PATIENT_REGISTRATION_ENABLED` | Must not be `true` (guard) |
| `TWILIO_WHATSAPP_ENABLED` | Must not be `true` (guard) |

Script additionally requires `isSmtpReadyForIdentity()` before processing — fail-closed until O-B-P04B.

---

## 8. Duplicate worker / idempotency

Production entrypoint calls existing `processDueNotifications` — same lease/claim/retry/idempotency as staging. No second implementation introduced.

---

## 9. Findings

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| F1 | Info | Production worker cannot run until O-B-P04B SMTP secrets exist | Expected dependency |
| F2 | Info | Profile env alone is not cryptographic proof of ACA identity; operational binding via O-B-P04C container config | Accepted per architecture |
| F3 | None | No critical or high findings | — |

---

## 10. Security review verdict

```text
SECURITY REVIEW = PASS
SECRET LEAKAGE = NONE DETECTED
PRODUCTION GUARD = PRESERVED
GENERIC BYPASS = NOT INTRODUCED
```

---

## 11. Rollback (security)

Revert application files listed in §1. No KV, DNS, Vercel, or database changes required to disable the new entrypoint.
