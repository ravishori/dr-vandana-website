# Inbound email webhook — not implemented

## Status

**Inbound email → conversation webhook is NOT implemented** in this milestone.

Appointment enquiries are captured at form submission time (persisted into the communications store). Doctor replies are sent outbound via SMTP with threading headers (`Message-ID`, `In-Reply-To`, `References`) when available.

User replies sent by email back to the practice mailbox are **not** automatically ingested into the portal thread.

## Why

Inbound parsing depends on the email provider (e.g. SendGrid Inbound Parse, Mailgun routes, Postmark inbound, or a custom IMAP poller). Production currently uses generic SMTP credentials without a verified inbound webhook endpoint.

## Future-ready architecture

When a provider is selected:

1. Expose a signed webhook route (e.g. `POST /api/communications/inbound`) that verifies provider signatures.
2. Match inbound mail using `In-Reply-To` / `References` against stored `emailMessageId` values, falling back to `+conversationId` recipient aliases if configured.
3. Append an `INBOUND` `USER` message to the conversation; set status to `AWAITING_REPLY`.
4. Never treat inbound email as clinical charting — this remains a website enquiry inbox, **not an EHR**.

Until then, doctors should continue conversations in the portal or their normal mailbox, and optionally paste follow-ups manually in a later milestone.
