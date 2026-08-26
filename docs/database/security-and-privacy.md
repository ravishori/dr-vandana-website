# Security & Privacy Architecture

## Database
- Use Azure Database for PostgreSQL Flexible Server.
- Enforce TLS for connections.
- Use least-privilege database/application accounts.
- Never expose PostgreSQL credentials to frontend code.
- Store application secrets in Azure Key Vault or a secure deployment secret store.
- Do not commit .env files or secrets to Git.

## Authorization
- Authentication is not sufficient; every protected endpoint must authorize the requested resource.
- Enforce patient-level access checks server-side.
- Separate public CMS access from protected practice-management access.
- Restrict session notes, patient notes, documents, consents and billing to authorized roles.
- Maintain audit logs for sensitive operations.

## Patient documents
- Store actual files in private Azure Blob Storage.
- Store only metadata and blob references in PostgreSQL.
- Do not use permanent public URLs.
- Generate short-lived authorized access when needed.
- Validate file type, size and content where appropriate.
- Record upload/access events where appropriate.

## Data minimization
- Collect only information required for the feature.
- Avoid unnecessary analytics identifiers.
- Do not store raw payment-card data.
- Avoid putting sensitive information into email/SMS logs unless operationally necessary.

## Deletion/retention
- Define retention rules before production launch.
- Prefer controlled archival/soft-delete workflows for clinical records.
- Do not implement automatic hard deletion of clinical data without an approved retention policy.

## Public content
- Testimonials require appropriate consent before publication.
- Blog/CMS content must avoid diagnosis, guaranteed outcomes or misleading medical claims.

## Production networking
Development can use restricted public access with a narrow firewall rule.
Before production, evaluate private networking/private endpoints and application-to-database network isolation.
