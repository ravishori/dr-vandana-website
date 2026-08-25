# Admin Dashboard & RBAC Specification v1.0
## Dr. Vandana Wellness Assistant

**Baseline:** BRD v2.1 + SCRS v1.0 + Technical Architecture v1.0  
**Status:** Engineering / Governance Specification  
**Target:** MVP / Phase 1

---

# 1. Purpose

The Admin Dashboard provides authorized practice personnel with controlled visibility into safety events, notification state, transcript review, clinical notes, escalation and resolution.

The dashboard is an operational safety tool, not an autonomous emergency-response system.

---

# 2. Roles

## CLINICAL_REVIEWER

May:

- view authorized safety events;
- inspect relevant transcripts;
- acknowledge events;
- add clinical notes;
- manually escalate;
- resolve events with approved disposition codes.

Must not:

- manage infrastructure;
- change encryption configuration;
- change application permissions;
- modify safety policy without governance process.

## SYSTEM_ADMIN

May:

- manage technical infrastructure;
- manage user permissions;
- operate technical integrations;
- operate retention jobs;
- inspect technical audit information.

Should not automatically have clinical transcript access unless explicitly authorized and audited.

---

# 3. Authentication

Required:

- MFA;
- secure session management;
- 15-minute idle timeout;
- failed-login lockout;
- IP/device session logging;
- secure password hashing.

---

# 4. Dashboard Layout

Recommended sections:

```text
┌─────────────────────────────────────────────┐
│ Safety Operations Dashboard                 │
├──────────┬──────────┬──────────┬────────────┤
│ Critical │ High     │ Uncertain│ Moderate   │
├──────────┴──────────┴──────────┴────────────┤
│ Active Safety Events                         │
├─────────────────────────────────────────────┤
│ Event ID | Severity | Status | Age | Action │
├─────────────────────────────────────────────┤
│ Notification / Escalation Status             │
└─────────────────────────────────────────────┘
```

---

# 5. Severity Presentation

Internal severity labels may be shown to authorized staff:

- Critical — Level 3
- High — Level 2
- Uncertain — Level U
- Moderate — Level 1
- Normal — Level 0

Visitors must never see these internal labels.

---

# 6. Event Detail

Authorized staff may view:

- event identifier;
- severity;
- threat categories;
- trigger timestamp;
- current state;
- notification state;
- acknowledgement timer;
- relevant conversation transcript;
- safety policy version;
- response template version;
- audit history.

Access must be logged.

---

# 7. Incident Actions

Required actions:

### Acknowledge

Stops the acknowledgement countdown but does not resolve the event.

### Inspect Transcript

Displays authorized transcript content and creates `TRANSCRIPT_VIEWED` audit event.

### Add Clinical Note

Stores encrypted note content.

### Manual Escalation

Dispatches an authorized notification/referral.

### Resolve

Requires approved disposition code.

---

# 8. Resolution Dispositions

Initial examples:

- `USER_CONTACTED`
- `FALSE_POSITIVE_REVIEWED`
- `SESSION_TIMED_OUT`
- `REFERRED_TO_PROFESSIONAL_SUPPORT`
- `SECONDARY_ESCALATION_COMPLETED`
- `OTHER_APPROVED_DISPOSITION`

Clinical governance should approve the final taxonomy.

---

# 9. Acknowledgement Timers

Defaults:

```text
Level 3 = 180 seconds
Level 2 = 900 seconds
```

Timer states:

```text
PENDING_ACK
ACKNOWLEDGED
SECONDARY_ESCALATION
```

The timer must be server-authoritative.

Browser timers are display mechanisms only.

---

# 10. Notification Status

Show:

```text
DISPATCHED
DELIVERED
FAILED
ACKNOWLEDGED
SECONDARY_ESCALATION
```

Delivery confirmation must never be presented as human acknowledgement.

---

# 11. Deduplication UI

Repeated alerts within the configured suppression window should be grouped.

However:

- new severity escalation must create visible escalation;
- all messages remain auditable;
- staff can inspect the underlying conversation timeline.

---

# 12. RBAC Matrix

| Capability | Clinical Reviewer | System Admin |
|---|---:|---:|
| View safety events | Yes | Technical scope |
| View crisis transcript | Yes, audited | Not by default |
| Acknowledge event | Yes | No, unless explicitly authorized |
| Clinical notes | Yes | No |
| Manual escalation | Yes | Technical support only |
| Resolve clinical event | Yes | No |
| Manage admins | No | Yes |
| Manage infrastructure | No | Yes |
| Run retention jobs | No | Yes |
| Change safety policy | No direct change | No direct change |
| Verify emergency resources | Authorized clinical/admin process | Technical support |
| View audit records | Limited | Technical scope |

Final permissions must be reviewed before production.

---

# 13. Break-Glass Access

High-severity unassigned events may support temporary elevated review privileges.

Requirements:

- explicit reason;
- time-limited elevation;
- strong authentication;
- complete audit trail;
- post-incident review.

Break-glass must never become routine access.

---

# 14. Transcript Protection

- No bulk export by default.
- Copy/download controls should be restricted.
- Sensitive transcript content must not appear in general notification payloads.
- Screenshots cannot be technically prevented, but access must be minimized and audited.
- Search must be least-privilege.

---

# 15. Audit Events

Examples:

```text
ADMIN_LOGIN
ADMIN_LOGIN_FAILED
TRANSCRIPT_VIEWED
SAFETY_EVENT_VIEWED
EVENT_ACKNOWLEDGED
CLINICAL_NOTE_CREATED
MANUAL_ESCALATION
SECONDARY_ESCALATION
EVENT_RESOLVED
BREAK_GLASS_GRANTED
BREAK_GLASS_USED
RESOURCE_VERIFIED
```

---

# 16. Security Controls

Required:

- MFA;
- secure cookies/session tokens;
- CSRF protection where applicable;
- RBAC;
- least privilege;
- session timeout;
- failed-login lockout;
- audit logging;
- no sensitive data in URLs;
- no sensitive transcript content in client-side analytics.

---

# 17. Emergency Dashboard Resilience

The dashboard should clearly indicate:

- notification delivery failure;
- stale emergency-resource verification;
- safety-engine availability;
- notification-provider availability;
- unresolved critical events.

A dashboard outage must not disable the visitor's static emergency-resource pathway.

---

# 18. Production Acceptance

Before production:

- RBAC tests pass;
- MFA tests pass;
- transcript-view audit tests pass;
- acknowledgement timer tests pass;
- secondary escalation tests pass;
- break-glass tests pass;
- authorization bypass tests pass;
- notification-state tests pass;
- security review passes;
- clinical governance approves the operational workflow.
