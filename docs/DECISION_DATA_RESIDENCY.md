# Data Residency Decision

**Status:** OPEN (O18) — HUMAN DECISION + LEGAL REVIEW REQUIRED  
**Date:** 14 August 2026  

Map of **where Option B data may be processed**. Geographic locations below are **potential**, not certified. Processors are **not** approved by this document.

This is **not** a compliance claim (DPDP or otherwise). Region selection is not proof of lawful processing.

Do not change DNS, hosting, or vendors from this file.

---

## Map

| Component | Processor (current / candidate) | Geographic processing location | Potential cross-border transfer | Legal review requirement |
|---|---|---|---|---|
| Application hosting | Current public site is Next.js / Vercel-style (`https://drvandana.trinetra.net`) | **UNVERIFIED** — Vercel and adjacent CDN/compute regions are typically multi-region | Yes, if the host executes Server Actions outside India while the database is in India (or vice versa) | LEGAL REVIEW |
| PostgreSQL | **UNSELECTED** (O1) | **UNSELECTED** (O2) — India preferred, not chosen | Yes, if vendor, replicas, or support access data from another country | LEGAL REVIEW after O1/O2 |
| Backups | Follows PostgreSQL vendor or a separate backup vendor | **UNSELECTED** — may differ from primary | Yes, if snapshots replicate cross-region | LEGAL REVIEW |
| SMTP | **UNSELECTED** | **UNSELECTED** — mailbox or transactional vendor | Yes, message content and addresses often leave the app region | LEGAL REVIEW |
| OTP / SMS | **UNSELECTED** (O4) | **UNSELECTED** — SMS gateways and vendor APIs | Yes, numbers and OTP metadata | LEGAL REVIEW |
| Twilio | Preferred WhatsApp direction; **not activated** | Twilio processing locations **UNVERIFIED** | Likely yes | LEGAL REVIEW before `TWILIO_WHATSAPP_ENABLED=true` |
| Meta / WhatsApp | Meta WhatsApp Business platform via Twilio | Meta processing locations **UNVERIFIED** | Likely yes | LEGAL REVIEW |
| Monitoring / APM | **UNSELECTED** | **UNSELECTED** | Yes, if traces include personal data | LEGAL REVIEW; minimize PII in logs |
| Error logging | Optional `ERROR_NOTIFY_EMAIL` / future APM | **UNSELECTED** | Yes | LEGAL REVIEW; no secrets/OTP in errors |
| Question portal SQLite | Local/host filesystem (`QUESTION_STORE`) | Follows app host | Follows host | Existing public feature; confirm consistency |
| Redis rate limit | Optional Upstash | **UNVERIFIED** if enabled | Possible | LEGAL REVIEW if used in production identity |

---

## Questions the owner and counsel must answer

1. Must the **primary** patient identity and appointment database remain in India?  
2. Is application hosting outside India acceptable if the database is in India?  
3. Are Twilio/Meta WhatsApp subprocessors acceptable for appointment notifications?  
4. Where may backups live?  
5. What must the privacy notice list as processors **before** registration is enabled?  

Until answered: **OPEN**. Production remains **BLOCKED**.
