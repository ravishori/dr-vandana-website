# API Specification v1.0
## Dr. Vandana Wellness Assistant

**Baseline:** BRD v2.1 + SCRS v1.0 + Technical Architecture v1.0  
**Status:** Engineering Specification Baseline  
**Target:** MVP / Phase 1

---

## 1. API Principles

- All APIs are versioned under `/api/v1`.
- Safety routing occurs before unrestricted LLM invocation.
- Levels U, 2 and 3 never invoke unrestricted generative AI.
- Critical safety decisions are server-authoritative.
- Internal risk scores and classifier labels are never exposed to visitors.
- Every safety-sensitive operation carries correlation/request IDs.
- Administrative access requires authentication, authorization and audit logging.
- Emergency-resource presentation must remain available during dependency failure.

---

## 2. Authentication Model

### Visitor

Anonymous sessions use an opaque, short-lived session token.

### Administration

Administrative APIs require:

- authenticated admin identity;
- MFA;
- RBAC authorization;
- session validation;
- audit context.

---

## 3. Common Response Envelope

Successful responses:

```json
{
  "data": {},
  "request_id": "uuid"
}
```

Error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe human-readable message"
  },
  "request_id": "uuid"
}
```

Do not expose stack traces, internal classifier scores, provider credentials, prompts, or hidden system instructions.

---

# 4. Consent APIs

## POST `/api/v1/consent`

Records acknowledgement of the current boundary notice.

Request:

```json
{
  "notice_version": "v1.0",
  "purpose_codes": ["WELLNESS_ASSISTANCE", "SAFETY_MONITORING"]
}
```

Response:

```json
{
  "data": {
    "consent_id": "uuid",
    "status": "ACCEPTED"
  },
  "request_id": "uuid"
}
```

Consent must be established before normal chat begins.

---

# 5. Session APIs

## POST `/api/v1/sessions`

Creates an anonymous session.

Response includes an opaque session token. Do not expose internal database identifiers unnecessarily.

## GET `/api/v1/sessions/{session_id}`

Returns only visitor-safe session information.

## DELETE `/api/v1/sessions/{session_id}`

Closes the session where permitted.

---

# 6. Conversation APIs

## POST `/api/v1/conversations`

Creates a conversation associated with an authorized session.

## GET `/api/v1/conversations/{conversation_id}`

Returns visitor-authorized conversation metadata.

## POST `/api/v1/conversations/{conversation_id}/close`

Closes a normal conversation.

Level 3 conversations may remain safety-controlled and cannot be arbitrarily closed by the visitor.

---

# 7. Message API

## POST `/api/v1/messages`

Primary chat ingress.

Request:

```json
{
  "conversation_id": "uuid",
  "content": "User message"
}
```

Processing:

```text
Validation
→ Consent
→ Rate limit
→ Safety Engine
→ Routing
→ Response
```

Response:

```json
{
  "data": {
    "message_id": "uuid",
    "response": {
      "type": "NORMAL | SUPPORT | SAFETY | CRISIS | FAILSAFE",
      "content": "Approved response",
      "actions": []
    },
    "conversation_state": "ACTIVE | SAFETY | CRISIS | CLOSED"
  },
  "request_id": "uuid"
}
```

Internal safety fields must not be returned to visitors.

---

# 8. Level 3 Restricted Safety API

## POST `/api/v1/conversations/{conversation_id}/safety-action`

Allowed actions must come from an approved enum.

Example:

```json
{
  "action": "I_CALLED_112"
}
```

Possible actions:

- `I_CALLED_112`
- `SOMEONE_IS_WITH_ME`
- `I_CANNOT_CALL`

Free text must not be routed to the normal LLM path.

---

# 9. Emergency Resource API

## GET `/api/v1/emergency-resources`

Returns currently active, verified resources appropriate to the visitor jurisdiction and safety context.

The API must have a static/signed fallback when the database is unavailable.

---

# 10. Appointment APIs

## GET `/api/v1/appointments/services`

Returns approved consultation/service information.

## POST `/api/v1/appointments/requests`

Creates an appointment inquiry/request.

No appointment API may override an active crisis pathway.

---

# 11. Admin Safety APIs

All admin endpoints require RBAC.

## GET `/api/v1/admin/events`

Supports filters:

- severity;
- status;
- date range;
- threat category.

## GET `/api/v1/admin/events/{event_id}`

Returns authorized event information.

Transcript access must create an audit event.

## POST `/api/v1/admin/events/{event_id}/acknowledge`

Acknowledges an event.

## POST `/api/v1/admin/events/{event_id}/notes`

Creates an encrypted clinical note where permitted.

## POST `/api/v1/admin/events/{event_id}/escalate`

Dispatches manual/secondary escalation.

## POST `/api/v1/admin/events/{event_id}/resolve`

Requires an approved disposition code.

Example:

```json
{
  "disposition_code": "USER_CONTACTED",
  "notes": "Encrypted clinical note"
}
```

---

# 12. Notification APIs

Internal/service APIs only.

## POST `/api/v1/admin/notifications/{event_id}/dispatch`

Dispatches an authorized notification.

## GET `/api/v1/admin/notifications/{event_id}`

Returns delivery state to authorized staff.

States:

- `DISPATCHED`
- `DELIVERED`
- `FAILED`
- `ACKNOWLEDGED`
- `SECONDARY_ESCALATION`

---

# 13. Audit APIs

## GET `/api/v1/admin/audit`

Restricted to authorized administrative roles.

Audit records are append-only from the application perspective.

---

# 14. Knowledge APIs

Internal/admin controlled APIs:

- knowledge-source registration;
- version management;
- indexing status;
- source validation.

Normal visitors must never directly manipulate the knowledge base.

---

# 15. Safety API Contract

The internal Safety Engine should return a structured decision similar to:

```json
{
  "severity": "0|1|U|2|3|FAILSAFE",
  "threat_tags": [],
  "classifier_version": "string",
  "policy_version": "string",
  "template_version": "string|null",
  "route": "NORMAL|SUPPORT|SAFE|SAFETY|CRISIS|FAILSAFE"
}
```

This object remains internal.

---

# 16. Error Handling

Required safe errors:

- `CONSENT_REQUIRED`
- `INVALID_SESSION`
- `RATE_LIMITED`
- `MESSAGE_INVALID`
- `SAFETY_ENGINE_TIMEOUT`
- `SAFETY_ENGINE_UNAVAILABLE`
- `RESOURCE_REGISTRY_UNAVAILABLE`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

A safety-engine failure must result in fail-safe emergency-resource presentation.

---

# 17. Idempotency

Safety-event creation and notification dispatch must use idempotency/correlation keys.

Repeated client retries must not create uncontrolled duplicate critical alerts.

However, worsening severity must always be processed as a new escalation where required by policy.

---

# 18. API Security

- TLS 1.3.
- Strict request validation.
- Authentication and RBAC for admin endpoints.
- Rate limiting.
- Request-size limits.
- Secure headers.
- CSRF protection where cookie authentication is used.
- Secrets outside source control.
- No direct browser access to PostgreSQL, Redis, LLM or notification providers.

---

# 19. API Observability

Every request should carry:

- request ID;
- correlation ID;
- timestamp;
- service/module;
- latency;
- outcome.

Do not log sensitive message content unnecessarily.

---

# 20. API Production Gate

API implementation is not production-ready until:

- contract tests pass;
- security tests pass;
- safety routing tests pass;
- Level U/2/3 zero-LLM tests pass;
- fail-safe tests pass;
- audit tests pass;
- Golden Set tests pass;
- clinical governance requirements are satisfied.
