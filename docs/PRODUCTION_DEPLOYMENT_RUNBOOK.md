# Production Deployment Runbook

**Status:** Not a deployment. **PRODUCTION BLOCKED.** Do not execute against production from this milestone.

Order is deliberate. **Enable registration only after the final gate.**

1. Create infrastructure (host + network) — HUMAN DECISION for vendor.
2. Configure the host secret store (names in `docs/PRODUCTION_ENVIRONMENT_CHECKLIST.md`). Never commit values.
3. Configure PostgreSQL (vendor O1, region O2, TLS, pooling). Do not invent credentials.
4. Verify TLS (site, database, SMTP, OTP API).
5. Run **deliberate** migrations: `APPLY_IDENTITY_MIGRATION=true npm run db:migrate` after a backup. The CLI fails closed if `btree_gist` or the exclusion constraint is missing.
6. Verify schema: `npm run db:verify-production` on the **target** database.
7. Confirm `btree_gist`.
8. Confirm `appointments_blocking_occupied_excl`.
9. Configure SMTP (not test/mock in production).
10. Configure OTP only after a vendor adapter exists (currently unimplemented — fail-closed).
11. Configure Twilio only after sender, templates, opt-in legal review, and secrets exist. Keep `TWILIO_WHATSAPP_ENABLED=false` until then.
12. Configure notification worker hosting (O15). Do not use `npm run notifications:process` in production.
13. Configure monitoring (provider OPEN).
14. Run smoke tests in the staged environment.
15. Verify backups exist.
16. Verify restore (**NOT EXECUTED** until a drill is actually performed).
17. Security review of the **deployed** environment (code audit is not sufficient).
18. Legal approval of privacy, terms, consent, WhatsApp wording.
19. Enable registration **only** after every required gate is genuinely green: `PATIENT_REGISTRATION_ENABLED` remains false until that explicit decision.

Privileged users: do **not** use `npm run db:provision` in production (hard-refused). First Super Admin / psychologist bootstrap is **O19 OPEN**.
