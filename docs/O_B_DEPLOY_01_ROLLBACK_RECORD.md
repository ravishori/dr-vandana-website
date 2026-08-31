# O-B-DEPLOY-01 Rollback Record

**Document type:** Rollback readiness record  
**Date:** 2026-08-31  
**Deployment task:** O-B-DEPLOY-01  
**Rollback status:** **READY** — **NOT EXECUTED** (deployment succeeded)

---

## 1. Current Production (post O-B-DEPLOY-01)

| Item | Value |
| --- | --- |
| Vercel project | `dr-vandana-website` |
| Project ID | `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c` |
| Deployment ID | `dpl_6wJipdAHXB13E8zASz7knrAjhiqL` |
| Deployment URL | `https://dr-vandana-website-59wafcn67-trinetra-digital-lab.vercel.app` |
| Public alias | `https://drvandana.trinetralab.net` |
| Status | **READY** |
| Git commit | `99d408a588a694c801c980a11b7f544b38d7fa09` |
| Branch | `cursor/verifier-required-tables-be7a` |

---

## 2. Previous known-good Production (rollback target)

Immediate prior Production deployment observed before/around this release:

| Item | Value |
| --- | --- |
| Deployment ID | `dpl_5pwzy719dULJ95V4WU2uz7Eqokho` |
| Deployment URL | `https://dr-vandana-website-f4xufcm2a-trinetra-digital-lab.vercel.app` |
| Environment | Production |
| Status at record time | **Ready** |
| Created | 2026-08-31 ~10:09 IST (~3h before current deploy) |

Use Vercel dashboard or CLI to promote/rollback to this deployment **only if authorized** after a Production incident.

Example (do not run unless rollback is authorized):

```text
vercel rollback <previous-deployment-url-or-id> --scope trinetra-digital-lab
```

Confirm project is **`dr-vandana-website`** / `prj_PNCoWeIIF2uTJgsQ6HN7Y0v8bo6c` before any rollback action. Do **not** target `drvandana-psychology`.

---

## 3. Rollback constraints (unchanged)

If rollback is required:

| Action | Allowed? |
| --- | --- |
| Promote previous Vercel Production deployment | **YES** (authorized separately if needed) |
| Emergency unrelated code changes | **NO** |
| Modify Production database / run migrations | **NO** (unless separately authorized) |
| Modify Production Key Vault | **NO** |
| Modify Production ACA worker | **NO** |
| Modify DNS | **NO** |
| Enable registration or WhatsApp | **NO** |

---

## 4. Decision

| Field | Value |
| --- | --- |
| Rollback required by O-B-DEPLOY-01 outcome? | **NO** |
| Rollback executed? | **NO** |
| Rollback readiness | **READY** |

```text
ROLLBACK = READY / NOT REQUIRED
```
