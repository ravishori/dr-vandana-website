# Table-by-Table Design

Conventions:
- Prefer UUID primary keys.
- Use timestamptz for timestamps.
- Use UTC internally; render in configured clinic/user timezone.
- Add created_at and updated_at where applicable.
- Add created_by/updated_by on sensitive records where appropriate.
- Use foreign keys and explicit indexes.
- Use soft deletion only where operationally justified.
- Avoid hard-delete cascades for clinical records.

## Identity & RBAC

### users
Purpose: authenticated application users.
Key columns:
- id UUID PK
- email UNIQUE
- password_hash nullable only if local auth is used
- first_name
- last_name
- phone
- status
- last_login_at
- created_at
- updated_at

### roles
- id UUID PK
- name UNIQUE
- description
- created_at
- updated_at

### permissions
- id UUID PK
- name UNIQUE
- description

### user_roles
- user_id FK users
- role_id FK roles
- composite UNIQUE(user_id, role_id)

### role_permissions
- role_id FK roles
- permission_id FK permissions
- composite UNIQUE(role_id, permission_id)

### audit_logs
- id UUID PK
- actor_user_id FK users nullable
- action
- entity_type
- entity_id
- old_values JSONB nullable
- new_values JSONB nullable
- ip_address
- user_agent
- created_at
Security: restrict read access to authorized administrators.

## Patient Management

### patients
Purpose: patient identity/profile.
Suggested columns:
- id UUID PK
- patient_number UNIQUE
- first_name
- last_name
- date_of_birth
- gender
- email
- phone
- alternate_phone
- address
- city
- state
- pincode
- occupation
- marital_status
- referral_source
- preferred_contact_method
- status
- created_by FK users
- updated_by FK users
- created_at
- updated_at
- deleted_at nullable

Do not store detailed counselling notes in this table.

### patient_contacts
- id UUID PK
- patient_id FK patients
- contact_type
- contact_value
- is_primary
- verified_at
- created_at
- updated_at

### patient_emergency_contacts
- id UUID PK
- patient_id FK patients
- name
- relationship
- phone
- alternate_phone
- notes
- created_at
- updated_at

### patient_consents
- id UUID PK
- patient_id FK patients
- consent_type
- consent_version
- status
- granted_at
- revoked_at
- source
- recorded_by FK users
- created_at
- updated_at

### patient_notes
- id UUID PK
- patient_id FK patients
- note_type
- note_content
- created_by FK users
- updated_by FK users
- created_at
- updated_at
- deleted_at nullable

### patient_tags
- id UUID PK
- name UNIQUE
- description
- created_at

### patient_tag_assignments
- patient_id FK patients
- tag_id FK patient_tags
- created_at
- composite PK(patient_id, tag_id)

### patient_documents
- id UUID PK
- patient_id FK patients
- document_type
- file_name
- blob_container
- blob_path
- mime_type
- file_size
- checksum
- uploaded_by FK users
- created_at
- deleted_at nullable

Security: private Blob container; no public URLs; use short-lived authorized access when required.

## Appointments

### appointment_types
- id UUID PK
- name
- description
- duration_minutes
- mode
- price
- active
- created_at
- updated_at

### appointments
- id UUID PK
- patient_id FK patients
- appointment_type_id FK appointment_types
- assigned_professional_id FK users
- start_time
- end_time
- timezone
- mode
- location
- meeting_url nullable
- reason nullable
- status
- notes nullable
- created_by FK users
- updated_by FK users
- created_at
- updated_at

### appointment_status_history
- id UUID PK
- appointment_id FK appointments
- old_status
- new_status
- changed_by FK users
- reason
- changed_at

### availability_slots
- id UUID PK
- professional_id FK users
- start_time
- end_time
- status
- recurrence_rule nullable
- created_at
- updated_at

### holidays
- id UUID PK
- date
- name
- applies_to_all
- created_at

## Counselling & Goals

### counselling_sessions
- id UUID PK
- patient_id FK patients
- appointment_id FK appointments nullable
- session_number
- session_date
- duration_minutes
- session_type
- status
- created_by FK users
- updated_by FK users
- created_at
- updated_at

### session_notes
- id UUID PK
- session_id FK counselling_sessions UNIQUE
- summary
- observations
- interventions
- progress_notes
- homework
- follow_up_plan
- private_notes
- created_by FK users
- updated_by FK users
- created_at
- updated_at
- deleted_at nullable

Security: clinical/session notes require server-side authorization and must never be exposed through public endpoints.

### treatment_goals
- id UUID PK
- name
- description
- active
- created_at

### patient_goals
- id UUID PK
- patient_id FK patients
- goal_id FK treatment_goals nullable
- description
- status
- start_date
- target_date
- completion_date
- progress_notes
- created_by FK users
- updated_at

## Billing

### invoices
- id UUID PK
- patient_id FK patients
- invoice_number UNIQUE
- invoice_date
- due_date
- subtotal
- tax
- discount
- total
- currency
- status
- created_by FK users
- created_at
- updated_at

### invoice_items
- id UUID PK
- invoice_id FK invoices
- description
- quantity
- unit_price
- amount

### payments
- id UUID PK
- invoice_id FK invoices
- amount
- payment_method
- payment_date
- status
- reference_number
- created_at

### payment_transactions
- id UUID PK
- payment_id FK payments nullable
- provider
- provider_transaction_id
- status
- amount
- currency
- response_code
- created_at
- updated_at

Never store raw card numbers, CVV or other payment-card secrets.

## CMS & Blog

### pages
- id UUID PK
- title
- slug UNIQUE
- content
- excerpt
- page_type
- status
- seo_title
- seo_description
- canonical_url
- featured_image_id FK media nullable
- created_by FK users
- updated_by FK users
- created_at
- updated_at

### blog_categories
- id UUID PK
- name
- slug UNIQUE
- description
- created_at
- updated_at

### blog_posts
- id UUID PK
- title
- slug UNIQUE
- excerpt
- content
- category_id FK blog_categories
- author_id FK users
- featured_image_id FK media nullable
- status
- seo_title
- seo_description
- canonical_url
- published_at
- created_at
- updated_at

### blog_tags
- id UUID PK
- name UNIQUE
- slug UNIQUE

### blog_post_tags
- post_id FK blog_posts
- tag_id FK blog_tags
- composite PK(post_id, tag_id)

### media
- id UUID PK
- file_name
- storage_provider
- storage_path
- mime_type
- file_size
- checksum
- alt_text
- uploaded_by FK users
- created_at
- updated_at

### faqs
- id UUID PK
- question
- answer
- category
- display_order
- status
- created_at
- updated_at

### testimonials
- id UUID PK
- display_name
- content
- rating
- consent_status
- status
- display_order
- created_at
- updated_at

## Enquiries & Communication

### contact_enquiries
- id UUID PK
- name
- email
- phone
- subject
- message
- enquiry_type
- status
- assigned_to FK users nullable
- created_at
- updated_at

### appointment_enquiries
- id UUID PK
- name
- email
- phone
- preferred_date
- preferred_time
- appointment_type_id FK appointment_types nullable
- mode
- message
- status
- assigned_to FK users nullable
- created_at
- updated_at

### newsletter_subscribers
- id UUID PK
- email UNIQUE
- name nullable
- status
- consent_timestamp
- unsubscribe_timestamp
- source
- created_at
- updated_at

### notifications
- id UUID PK
- user_id FK users nullable
- patient_id FK patients nullable
- notification_type
- title
- message
- status
- read_at
- created_at

### email_logs
- id UUID PK
- recipient
- subject
- template
- status
- provider_message_id
- sent_at
- failure_reason
- created_at

### sms_logs
- id UUID PK
- recipient
- template
- status
- provider_message_id
- sent_at
- failure_reason
- created_at

## Configuration

### site_settings
- id UUID PK
- setting_key UNIQUE
- setting_value JSONB
- is_public
- updated_by FK users
- updated_at

Do not store secrets here.

### clinic_settings
- id UUID PK
- clinic_name
- timezone
- contact_email
- contact_phone
- address
- working_hours JSONB
- appointment_settings JSONB
- updated_by FK users
- updated_at

### notification_settings
- id UUID PK
- notification_type UNIQUE
- email_enabled
- sms_enabled
- in_app_enabled
- template_config JSONB
- updated_by FK users
- updated_at

## Analytics

### website_events
- id UUID PK
- event_type
- page_path
- session_identifier nullable
- user_id FK users nullable
- metadata JSONB
- occurred_at

Avoid collecting unnecessary personal information.
