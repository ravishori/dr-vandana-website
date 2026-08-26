# Relationship Map

users
├── user_roles ── roles ── role_permissions ── permissions
├── audit_logs
├── patients.created_by / updated_by
├── appointments.assigned_professional_id
├── counselling_sessions.created_by / updated_by
├── session_notes.created_by / updated_by
└── CMS authors/editors

patients
├── patient_contacts
├── patient_emergency_contacts
├── patient_consents
├── patient_notes
├── patient_documents
├── patient_tag_assignments ── patient_tags
├── appointments
├── counselling_sessions
├── patient_goals
├── invoices
└── notifications

appointments
├── appointment_type
├── patient
├── assigned professional
├── appointment_status_history
└── counselling_session

counselling_sessions
└── session_notes

treatment_goals
└── patient_goals

invoices
├── invoice_items
├── payments
└── payment_transactions

CMS
blog_categories ── blog_posts ── blog_post_tags ── blog_tags
pages ── media
blog_posts ── media
testimonials
faqs

Enquiries
contact_enquiries
appointment_enquiries ── appointment_types

Communication
notifications
email_logs
sms_logs

Configuration
site_settings
clinic_settings
notification_settings

Analytics
website_events
