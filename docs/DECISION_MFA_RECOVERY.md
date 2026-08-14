# MFA Recovery Decision

**Status:** OPEN (O12) — HUMAN DECISION REQUIRED  
**Date:** 14 August 2026  

Implemented today: hashed, single-use TOTP **backup codes**, shown once at enrollment. Password is still required to reach the MFA challenge. There is **no** in-app recovery if both the authenticator **and** the backup codes are lost.

**Do not implement a recovery bypass in this phase.**

## EMAIL-ONLY MFA BYPASS IS FORBIDDEN.

```text
Forgot MFA
+
Send email
=
MFA bypass
```

That pattern must not be added. Email control is not equivalent to a second factor.

Related: O19 (who holds Super Admin / psychologist backup codes) remains OPEN. Super Admin dashboard remains DEFERRED.

---

## Option A — Super Admin controlled reset

A provisioned Super Admin, after authenticating with **their own** MFA, performs a controlled reset of the psychologist MFA credential (new secret and/or new backup codes) through a future, reviewed admin action.

| Dimension | Assessment |
|---|---|
| Security benefit | Avoids email-only bypass; change is authenticated and can be audited |
| Operational benefit | Faster than a backup restore if a second privileged human exists |
| Primary attack risk | Compromised Super Admin resets psychologist MFA; account takeover of the practice calendar |
| Recovery risk | If the Super Admin is also locked out, Option A cannot proceed |
| Implementation complexity | Requires a reviewed admin action (dashboard is DEFERRED); dual control not designed |

---

## Option B — Out-of-band identity verification

The practice verifies the psychologist’s identity through a written out-of-band process, then an authorised operator applies a reviewed break-glass change (re-enrollment).

| Dimension | Assessment |
|---|---|
| Security benefit | Strength equals the identity-proofing process |
| Operational benefit | Works even without a Super Admin UI |
| Primary attack risk | Social engineering / helpdesk impersonation if proofing is informal |
| Recovery risk | Slow or blocked if the verifier is unavailable |
| Implementation complexity | Playbook + two-person integrity (HUMAN DECISION); little or no product code |

---

## Option C — Reviewed backup restoration

Restore from a known-good backup and/or replace `mfa_credentials` / recovery hashes through a reviewed offline procedure.

| Dimension | Assessment |
|---|---|
| Security benefit | High if backup access is tightly controlled and restores are tested |
| Operational benefit | Independent of application MFA UI |
| Primary attack risk | Anyone with backup + DB access can mint MFA state |
| Recovery risk | Restore may roll back **other** identity and appointment rows unless PITR targeting is precise |
| Implementation complexity | Depends on tested backups (currently NOT EXECUTED) |

---

## Option D — Alternative approved ceremony

Hardware keys, split knowledge, in-person ceremony, or another mechanism **only after explicit human approval**.

| Dimension | Assessment |
|---|---|
| Security benefit | Can exceed TOTP+codes if well designed |
| Operational benefit | Must fit a sole-psychologist practice |
| Primary attack risk | Depends on the ceremony |
| Recovery risk | Depends on the ceremony |
| Implementation complexity | Unknown until specified; must still forbid email-only bypass |

---

## What must remain true for any option

- Audited (`MFA_ENABLED` / future `MFA_RECOVERY` events, actor, target)
- No OTP/MFA codes in email
- No secret values in Git or tickets
- Compatible with mandatory TOTP for `PSYCHOLOGIST` and `SUPER_ADMIN`

**Do not select A–D in this document.**
