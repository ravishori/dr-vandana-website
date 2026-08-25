# Visitor Chat & Safety UX Specification v1.0

**System:** Dr. Vandana Wellness Assistant  
**Phase:** 3A — Visitor Chat & Safety UX  
**Status:** Engineering/UX Baseline  
**Base specifications:** BRD v2.1, SCRS v1.0, Technical Architecture v1.0, API Specification v1.0, Phase 1 and Phase 2 implementation

## 1. Purpose

Phase 3A introduces the visitor-facing Wellness Assistant experience on the existing Next.js website.

The objective is to provide a calm, accessible and trustworthy interface through which visitors can:
- Learn about mental wellness
- Ask general wellness questions
- Understand Dr. Vandana's services
- Navigate toward professional support
- Access emergency resources
- Interact safely when distress or crisis language is detected

The interface must never compromise the Phase 1/2 safety architecture.

## 2. Core UX Principle

> **Safety takes precedence over conversational continuity.**

The interface must never optimize for longer conversations, user retention, AI companionship, or emotional dependency.

The assistant should help the visitor reach the safest appropriate next step.

## 3. Visitor Journey

```text
Website
   ↓
Wellness Assistant Entry
   ↓
Consent & Boundary Notice
   ├── Decline → Return to website
   ↓
Create Anonymous Session
   ↓
Chat Interface
   ↓
POST /api/v1/messages
   ↓
Safety Engine
   ├── Level 0
   ├── Level 1
   ├── Level U
   ├── Level 2
   └── Level 3
   ↓
Response UI
```

## 4. Entry Point

Provide a clearly identifiable **Wellness Assistant** entry point.

Supporting text:

> Get reliable mental wellness information and guidance on finding professional support.

The entry point must not imply therapy, diagnosis, human counselling, or emergency monitoring.

## 5. Persistent Emergency Access

The chat interface must contain a persistent **“I Need Help Now”** control providing:
- **112 — National Emergency Services**
- **Tele-MANAS — 14416**
- **Tele-MANAS — 1800-89-14416**

The emergency UI must not depend exclusively on the API or database.

Reuse the existing verified emergency-resource implementation rather than duplicating emergency numbers.

## 6. Consent & Boundary Screen

Before chat begins, display a mandatory boundary notice:

> **Before you begin**
>
> This assistant provides general mental wellness information and appointment assistance. It is not a replacement for professional psychological assessment or emergency care.
>
> Conversations may be securely processed and retained for safety monitoring and service improvement as described in our Privacy Policy.
>
> If there is an imminent risk of harm to yourself or someone else, confidentiality cannot be guaranteed and you should seek immediate human or emergency support.

Actions:
- **I Understand & Continue**
- **Cancel**

Do not pre-select consent. The visitor must actively acknowledge the notice.

## 7. AI Identity

Clearly identify the system as an automated assistant:

> **Dr. Vandana Wellness Assistant**  
> *AI-powered mental wellness information assistant*

Never claim to be Dr. Vandana, a psychologist, therapist, or human operator.

## 8. Standard Chat UI

Include:
- Conversation area
- Message composer
- Send button
- Emergency access
- Clear assistant identity
- Session status where useful

Support 320px, 375px, 390px, and 430px mobile widths plus desktop.

## 9. Level 0 UX

Level 0 represents ordinary informational interaction.

Example:

> “What are grounding techniques?”

Render ordinary assistant content without exposing internal risk information.

During Phase 3A the backend continues using the bounded Level 0 provider stub.

## 10. Level 1 UX — Emotional Distress

Example:

> “I've been feeling overwhelmed lately.”

Render supportive content without displaying internal risk labels.

Recommended structure:

**Acknowledgement**

> It sounds like things have been feeling quite overwhelming.

**Support**

> Taking a pause, connecting with someone you trust, and getting professional support can help.

Possible actions:
- Talk to someone
- Explore professional support
- Book a consultation

The assistant must not diagnose.

## 11. Level U UX — Ambiguous Safety Concern

Example:

> “Tonight everything will finally be quiet.”

Display a calm safety clarification:

> It sounds like you may be going through a very difficult time. Your safety matters.
>
> Are you thinking about hurting yourself, or are you in immediate danger?

Possible actions:
- Yes, I need help
- No, I'm overwhelmed
- I'm not sure

Emergency resources should be immediately visible.

Do not expose Level U, classifier confidence, or threat scores.

## 12. Level 2 UX — Active Risk

When Level 2 is detected, normal conversational behavior stops.

Display the approved deterministic safety response with a clear hierarchy:
1. Human support is available
2. Call Tele-MANAS
3. Talk to someone trusted
4. Professional support

The visitor must not receive unrestricted AI conversation.

## 13. Level 3 UX — Imminent Crisis

Immediately transition into **Crisis Safety Mode**.

Priority:
1. Call 112
2. Alert someone physically nearby
3. Call Tele-MANAS

Normal chat must be paused.

Example:

```text
Immediate Safety Help

If you are in immediate danger, please seek
human emergency assistance now.

[ CALL 112 ]

[ Someone is with me ]

[ I cannot call ]

[ CALL TELE-MANAS 14416 ]
```

## 14. Restricted Level 3 Input

The standard composer must be disabled.

Only approved safety-state actions may be available:
- I called 112
- Someone is with me
- I cannot call

If free text is supported, it must go through the deterministic safety fallback and never reach an LLM.

## 15. Emergency Resource Hierarchy

For imminent danger:
1. **112 — National Emergency Services**
2. **Someone physically nearby**
3. **Tele-MANAS — 14416 / 1800-89-14416**

Use the centralized emergency resource mechanism already established by Phase 1/2.

## 16. Error State

If the API fails, display a safe fallback:

> We're having trouble connecting right now. If you are in immediate danger, please call **112** or contact **Tele-MANAS at 14416**.

Emergency controls must continue working.

## 17. Network Failure

If connectivity is lost, locally available emergency information should remain accessible.

Never imply that a message was delivered, an administrator saw it, or emergency services were contacted unless the backend confirms it.

## 18. Loading State

Prefer:

> Preparing a response…

Avoid prolonged loading states during safety flows.

## 19. Accessibility

Support:
- Keyboard navigation
- Screen readers
- Visible focus states
- Sufficient contrast
- Accessible button labels
- Semantic headings
- `aria-live` for new assistant messages
- No color-only safety indicators

Emergency controls must be accessible without relying solely on icons.

## 20. Mobile UX

Mobile is a primary design target.

Emergency actions must remain reachable without excessive scrolling.

The message composer must not be obscured by the mobile keyboard.

Level 3 emergency controls should remain immediately visible.

Recommended minimum touch target: **44 × 44 CSS pixels**.

## 21. Privacy UX

Do not expose:
- session UUID
- conversation UUID
- event ID
- classifier ID
- risk score
- internal policy version

The visitor should only see user-appropriate information.

## 22. Session Expiry

If a session expires:

> Your session has expired. You can start a new conversation whenever you're ready.

Do not silently create a new session while implying continuity.

## 23. Crisis Conversation Lock

Once the backend returns a Level 3 state, the UI must respect:

`conversation_state = CRISIS_LOCKED`

It must not allow normal chat or client-side switching back to Level 0.

## 24. No False Handoff Claims

Never display:
- “A counsellor has been notified.”
- “Dr. Vandana has been alerted.”

unless the backend explicitly confirms such an event.

Until that infrastructure exists, direct the visitor toward human support.

## 25. Appointment Integration

Phase 3A may expose **Book a consultation**, but must not claim real-time availability unless an appointment backend provides it.

## 26. Visual Design

Match the existing Dr. Vandana website.

Preferred:
- White
- Sage
- Soft green
- Teal
- Soft blue
- Natural tones

Characteristics:
- Calm
- Premium
- Minimal
- Spacious
- Trustworthy
- Accessible

Avoid alarmist red-heavy design except where genuinely necessary.

## 27. Animation

Use subtle transitions only.

Avoid flashing, pulsing emergency animations, and distracting motion.

Respect `prefers-reduced-motion`.

## 28. Frontend Architecture

Reuse existing emergency data, components, design tokens, layout system, and accessibility patterns.

The frontend must consume the Phase 2 API rather than directly accessing PostgreSQL.

```text
Next.js
   ↓
FastAPI
   ↓
Safety Engine
   ↓
PostgreSQL
```

Never:

```text
Next.js
   ↓
PostgreSQL
```

## 29. API Integration

Use the Phase 2 APIs according to API_SPECIFICATION_v1.0:
- `POST /api/v1/consent`
- Session APIs
- Conversation APIs
- `POST /api/v1/messages`
- Safety-action API
- `GET /api/v1/emergency-resources`

Use the actual OpenAPI contract as authoritative for exact paths and schemas.

## 30. Client State Machine

```text
CONSENT_REQUIRED
      ↓
SESSION_CREATING
      ↓
READY
      ↓
SENDING
      ↓
RESPONSE_RECEIVED
      ├── NORMAL
      ├── DISTRESS
      ├── SAFETY_CLARIFICATION
      ├── ACTIVE_SAFETY
      └── CRISIS_LOCKED
```

The client must never independently determine the visitor's risk level. The backend is authoritative.

## 31. Security

The frontend must:
- Never contain secrets
- Never contain database credentials
- Never expose encryption keys
- Never trust client-provided risk levels
- Never trust client-provided user IDs
- Never bypass API validation

Do not store sensitive conversation content in unnecessary browser storage.

Do not place crisis transcripts in analytics payloads.

## 32. Analytics

Do not send conversation text, crisis messages, safety classifications, risk scores, or personal information to third-party analytics.

## 33. Testing Requirements

Test:
- Consent gating and cancellation
- Session creation and expiry
- Level 0 response
- Level 1 support UI
- Level U clarification and emergency resources
- Level 2 safety UI and conversation restriction
- Level 3 Crisis Safety Mode, disabled composer, 112, Tele-MANAS, and safety actions
- API failure and emergency fallback
- Security and safe content rendering
- Responsive widths: 320px, 375px, 390px, 430px
- Accessibility: keyboard, focus, ARIA, reduced motion

## 34. Acceptance Criteria

### UX
- Visitor can enter Wellness Assistant
- Consent is mandatory
- AI identity is clear
- Anonymous session starts correctly
- Conversation works
- Mobile UX works
- Accessibility baseline passes

### Safety
- Level 0 UI works
- Level 1 UI works
- Level U UI works
- Level 2 UI works
- Level 3 Crisis Safety Mode works
- Level 3 normal chat is locked
- Emergency resources remain accessible
- Backend remains authoritative
- No client-side risk classification

### Security
- No secrets in frontend
- No sensitive analytics
- No internal safety metadata exposed
- No database access from frontend

### Regression
- Existing marketing site remains intact
- Existing emergency UI remains intact
- Phase 1 tests remain passing
- Phase 2 tests remain passing
- Frontend tests pass
- ESLint passes
- TypeScript checks pass

## 35. Explicitly Excluded

Do not implement:
- Production LLM
- RAG
- Vector database
- Admin dashboard
- Admin MFA
- SMS
- WhatsApp
- Voice escalation
- Therapist portal
- EHR
- Appointment engine
- Multilingual support

These remain later controlled phases.
