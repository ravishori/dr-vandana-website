# Implementation Notes for Claude/Cursor

Do not create tables manually through the Azure Portal.

Generate version-controlled PostgreSQL migrations.

Recommended phases:
1. Extensions and baseline schema.
2. Identity/RBAC.
3. Patient management.
4. Appointments.
5. Counselling/sessions/goals.
6. Billing.
7. CMS/blog/media.
8. Enquiries/communication.
9. Configuration/analytics.
10. Indexes, constraints and audit triggers where justified.
11. Seed reference data.
12. Automated tests.
13. Security review.

Migration requirements:
- Re-runnable or safely versioned migrations.
- Explicit foreign keys.
- Explicit indexes for common filters and foreign keys.
- Check constraints for controlled statuses.
- Unique constraints where required.
- timestamptz for timestamps.
- UUID primary keys.
- JSONB only where flexible configuration/metadata is genuinely appropriate.
- Avoid unnecessary denormalization.

Before applying to production:
- Run migrations in development/staging.
- Verify rollback/recovery strategy.
- Verify RBAC.
- Verify that one patient cannot be accessed through another patient's ID.
- Verify document authorization.
- Verify audit logging.
- Verify backup/restore procedures.
