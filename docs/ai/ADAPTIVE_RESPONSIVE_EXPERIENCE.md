# Adaptive Responsive Experience (ARE)

Phase 1 presentation layer for the Dr. Vandana psychology website.

## Principles

- **One codebase** — no separate mobile/tablet/desktop applications
- **Shared business logic** — navigation, Ask AI, appointment enquiry unchanged at the API layer
- **Presentation only** — `DeviceProfile` is never stored, fingerprinted, or sent to the backend
- **Progressive enhancement** — CSS breakpoints remain authoritative; JS profile is optional

## Module

```
src/lib/adaptive/
  types.ts
  viewport.ts
  capabilities.ts
  os.ts
  accessibility.ts
  use-device-profile.ts
  index.ts
```

`AdaptiveExperience` sets `data-device-category`, `data-viewport-breakpoint`, and `data-orientation` on `<html>` for CSS hooks.

## Breakpoints (design ranges)

| Token | Width |
| --- | --- |
| xs | 0–374 |
| sm | 375–639 |
| md | 640–1023 |
| lg | 1024–1279 |
| xl | 1280–1535 |
| 2xl | 1536+ |

Category uses viewport + touch/pointer capability — not UA device model names alone.

## Out of scope (later phases)

- Authentication / sessions / password hashing
- Application database
- Ask AI retrieval architecture changes
- Appointment booking database
