# Dr. Vandana Psychology Practice — Database Architecture Package

Target platform:
- Azure Database for PostgreSQL Flexible Server
- PostgreSQL 17
- Azure server: pg-dr-vandana-prod
- Application database: dr_vandana_db

Purpose:
This package defines the proposed production database architecture before implementation by Claude/Cursor.

Important:
- This is an architecture/design package, not yet the production migration.
- Do not manually create all tables from Azure Portal.
- Review the design first, then generate version-controlled PostgreSQL migrations.
- Patient/counselling information must be treated as sensitive.
- Actual patient documents should be stored in private Azure Blob Storage; PostgreSQL stores metadata and references.
- Legal/regulatory retention, consent, privacy and data-residency requirements should be reviewed with appropriate professional/legal advice before production launch.

Recommended implementation sequence:
1. Review architecture.
2. Review table design and relationships.
3. Generate PostgreSQL migration(s).
4. Review migrations.
5. Apply to development/staging.
6. Test RBAC and patient-data isolation.
7. Apply to production Azure database.
