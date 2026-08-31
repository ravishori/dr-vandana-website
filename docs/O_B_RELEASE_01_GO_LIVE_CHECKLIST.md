# O-B-RELEASE-01 Go-Live Checklist

**Date:** 2026-08-31  
**Status:** **READY FOR CONTROLLED PRODUCTION DEPLOYMENT**  
**Deploy this task:** **NO**

---

## Closed in O-B-RELEASE-01

- [x] Active app domain/legal/AI citation strings → `drvandana.trinetralab.net`
- [x] `src/` free of `drvandana.trinetra.net`
- [x] Tests 378/378, typecheck, lint (2 pre-existing warnings), build PASS
- [x] Live site HTTP 200 + HSTS; robots/sitemap lab domain
- [x] KV secrets present/enabled; worker Job schedule/profile false flags
- [x] DB 27/27, btree_gist, exclusion, TLS

## Remaining open (non-blocking for this deploy with registration false)

- [ ] Operator attest Vercel `DATABASE_URL` matches KV
- [ ] Optional mailbox receipt confirmation
- [ ] Retry / restore drills (operational)
- [ ] Commit intended Option B artifacts; quarantine unrelated JPEG
- [ ] Keep registration/WhatsApp **false**

## Next controlled task (separate authorization)

- [ ] Explicit deploy authorization
- [ ] Deploy `dr-vandana-website` Production only
- [ ] Post-deploy smoke (no form submit)
- [ ] Confirm ACA Job still Succeeding
- [ ] Do **not** enable registration or WhatsApp
