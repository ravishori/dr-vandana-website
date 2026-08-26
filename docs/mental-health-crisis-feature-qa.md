# Mental Health Crisis Feature — QA Report

Date: 2026-08-14  
Branch: `cursor/mental-health-crisis-directory-a302`

## Implementation Status

- **Completed:** Public `/mental-health-support` page; verified seed for 112 / Tele-MANAS / Child Helpline 1098; psychologist admin CRUD + verification history; AI crisis canned responses updated; nav/footer/mobile Help entry; privacy copy; governance docs; unit tests; typecheck/build.
- **Partially completed:** NCW helpline seeded but **not** public (`NEEDS_REVIEW`, inactive) pending live reconfirmation on ncw.gov.in. Women Helpline 181 and Mumbai/Maharashtra locals intentionally omitted.
- **Not implemented:** Multi-role `MANAGE_CRISIS_RESOURCES` permission (single psychologist role reused); browser E2E automation; geolocation; multilingual emergency copy; dedicated analytics events.
- **Blocked:** None for the verified national trio. NCW publication blocked on human source re-check.

## Verified Resources

| Resource | Numbers | Official source | Status | Verified |
| --- | --- | --- | --- | --- |
| ERSS | 112 | https://112.gov.in/ | VERIFIED | 2026-08-14 |
| Tele-MANAS | 14416, 1800-89-14416 | https://www.dghs.mohfw.gov.in/national-mental-health-programme.php (+ telemanas.mohfw.gov.in) | VERIFIED | 2026-08-14 |
| Child Helpline | 1098 | https://www.spniwcd.wcd.gov.in/child-helpline | VERIFIED | 2026-08-14 |
| NCW Helpline | 7827170170 | https://www.ncw.gov.in/ | NEEDS_REVIEW (not public) | 2026-08-14 seed only |

## Testing

- Unit tests: `src/lib/crisis/crisis.test.ts` + existing AI/portal suites — **50 pass / 0 fail**
- Typecheck: pass
- Lint: pass (eslint exit 0)
- Build: pass (`/mental-health-support`, `/psychologist/crisis*`)
- E2E browser automation: not run in this environment (manual checklist below)
- Accessibility: semantic headings, `aria-label` on call buttons, keyboard-focusable links, no flashing content
- Security: unauthorized upsert rejected; HTTPS source URLs required; XSS stored as text; psychologist session required for mutations

### Manual E2E checklist

1. Open `/mental-health-support`
2. Confirm Immediate Danger + Call 112
3. Confirm Tele-MANAS 14416 and 1800-89-14416
4. Confirm Child Helpline 1098
5. Confirm official source links open with noopener
6. Confirm verification badges / last verified date
7. Confirm mobile tap targets
8. Confirm no personal data form on the page
9. Confirm crisis wording has no methods / cure claims
10. Confirm Ask AI self-harm path cites 112 + Tele-MANAS

## Database

SQLite (local default): `crisis_resources`, `crisis_resource_verifications`, `crisis_resources_meta`  
Upstash keys: `drvandana:crisis:*` when Redis env is present  
Env: `CRISIS_STORE`, `CRISIS_DATABASE_PATH`

## Important risks / human review

- NCW number must be re-verified before public activation.
- Production without Upstash uses in-process memory seed (admin writes may not persist across instances) — configure Upstash or persistent sqlite disk.
- Official pages can change; follow 30-day verification cadence for emergency numbers.
