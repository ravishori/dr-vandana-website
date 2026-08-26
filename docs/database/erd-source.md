# ERD Source

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned
    ROLES ||--o{ ROLE_PERMISSIONS : grants
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : contains

    PATIENTS ||--o{ PATIENT_CONTACTS : has
    PATIENTS ||--o{ PATIENT_EMERGENCY_CONTACTS : has
    PATIENTS ||--o{ PATIENT_CONSENTS : records
    PATIENTS ||--o{ PATIENT_NOTES : has
    PATIENTS ||--o{ PATIENT_DOCUMENTS : owns
    PATIENTS ||--o{ APPOINTMENTS : books
    PATIENTS ||--o{ COUNSELLING_SESSIONS : attends
    PATIENTS ||--o{ PATIENT_GOALS : has
    PATIENTS ||--o{ INVOICES : billed
    PATIENTS ||--o{ PATIENT_TAG_ASSIGNMENTS : tagged
    PATIENT_TAGS ||--o{ PATIENT_TAG_ASSIGNMENTS : applied

    APPOINTMENT_TYPES ||--o{ APPOINTMENTS : defines
    APPOINTMENTS ||--o{ APPOINTMENT_STATUS_HISTORY : tracks
    APPOINTMENTS ||--o| COUNSELLING_SESSIONS : produces

    COUNSELLING_SESSIONS ||--|| SESSION_NOTES : has
    TREATMENT_GOALS ||--o{ PATIENT_GOALS : defines

    INVOICES ||--o{ INVOICE_ITEMS : contains
    INVOICES ||--o{ PAYMENTS : receives
    PAYMENTS ||--o{ PAYMENT_TRANSACTIONS : records

    BLOG_CATEGORIES ||--o{ BLOG_POSTS : contains
    BLOG_POSTS ||--o{ BLOG_POST_TAGS : tagged
    BLOG_TAGS ||--o{ BLOG_POST_TAGS : applied
    MEDIA ||--o{ BLOG_POSTS : featured
    MEDIA ||--o{ PAGES : featured

    APPOINTMENT_TYPES ||--o{ APPOINTMENT_ENQUIRIES : requested
