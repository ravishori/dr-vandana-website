# Final Database Architecture

## 1. Azure topology

Azure Subscription
└── Resource Group: rg-dr-vandana-prod
    └── PostgreSQL Flexible Server: pg-dr-vandana-prod
        └── Database: dr_vandana_db
            └── public schema
                ├── Identity & RBAC
                ├── Patient Management
                ├── Appointments
                ├── Counselling & Goals
                ├── Billing
                ├── CMS & Blog
                ├── Enquiries & Communication
                ├── Media
                ├── Configuration
                ├── Analytics
                └── Audit/Security

Related Azure services:
- Azure Blob Storage: private patient documents and media
- Azure Key Vault: application secrets
- Azure Monitor / Application Insights: operational monitoring
