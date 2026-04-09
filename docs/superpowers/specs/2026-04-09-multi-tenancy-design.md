# OPORA Multi-Tenancy Design Spec

**Date**: 2026-04-09
**Status**: Approved
**Domain**: myopora.ru

## Overview

Convert OPORA from single-tenant to a full SaaS platform with Row-Level Isolation. Each organization (tenant) has fully isolated data within a shared PostgreSQL database. All rows are scoped by `organization_id`.

## Architecture Decision

**Row-Level Isolation** (Approach A): one database, one schema, `organization_id` column on every tenant-scoped table. Application-level middleware enforces scoping. Optional PostgreSQL RLS as a hardening layer later.

## 1. Data Model

### 1.1 Organization (extend existing)

```
organizations
  id              INT PK
  name            VARCHAR NOT NULL
  slug            VARCHAR UNIQUE INDEX — auto-generated from name
  owner_id        INT FK → users — the first admin who registered
  plan            ENUM [FREE, PRO] DEFAULT FREE
  plan_limits     JSONB DEFAULT {max_users: 3, max_visits_per_month: 100}
  bitrix24_webhook_url   VARCHAR NULLABLE — per-org Bitrix24 integration
  bitrix24_smart_process_visit_id  INT NULLABLE
  settings        JSONB DEFAULT {} — arbitrary org-level settings
  is_active       BOOL DEFAULT TRUE — platform admin can disable
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
```

### 1.2 User (extend existing)

```
users
  id              INT PK
  email           VARCHAR UNIQUE INDEX
  hashed_password VARCHAR
  organization_id INT FK → organizations NOT NULL
  role            ENUM [PLATFORM_ADMIN, ORG_ADMIN, USER]
  first_name      VARCHAR NULLABLE
  last_name       VARCHAR NULLABLE
  bitrix_user_id  INT NULLABLE
  is_active       BOOL DEFAULT TRUE
  regions         VARCHAR[] DEFAULT []
  invited_by      INT FK → users NULLABLE
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
```

**Migration from `is_admin`**:
- `is_admin=True` → `role=ORG_ADMIN`
- `is_admin=False` → `role=USER`
- Platform owner set to `role=PLATFORM_ADMIN` via data migration
- Drop `is_admin` column after migration

### 1.3 Invitation (new table)

```
invitations
  id              INT PK
  organization_id INT FK → organizations NOT NULL
  email           VARCHAR NOT NULL
  role            ENUM [ORG_ADMIN, USER] DEFAULT USER
  token           VARCHAR UNIQUE INDEX — UUID or secure random
  invited_by      INT FK → users NOT NULL
  accepted_at     TIMESTAMPTZ NULLABLE
  expires_at      TIMESTAMPTZ NOT NULL — default +7 days
  created_at      TIMESTAMPTZ
```

### 1.4 Tenant-Scoped Tables

All these tables get `organization_id INT FK → organizations NOT NULL`:

| Table | Currently has org_id | Action |
| --- | --- | --- |
| companies | nullable | make NOT NULL |
| visits | nullable | make NOT NULL |
| contacts | no | add NOT NULL |
| doctors | no | add NOT NULL |
| field_mappings | no | add NOT NULL |
| network_clinics | no | add NOT NULL |
| custom_sections | no | add NOT NULL |
| clinic_addresses | no (via company FK) | add NOT NULL |

### 1.5 GlobalSettings → OrgSettings

Rename `global_settings` to `org_settings`. Add `organization_id FK NOT NULL`. Each org has its own key-value settings (including Bitrix24 webhook URL, DaData tokens, etc).

For platform-wide settings (if needed), use `organization_id = NULL` or a separate `platform_settings` table.

## 2. Authentication & Roles

### 2.1 JWT Token Payload

```json
{
  "user_id": 42,
  "email": "ivan@company.ru",
  "role": "org_admin",
  "organization_id": 7,
  "exp": 1234567890
}
```

### 2.2 Role Hierarchy

Three roles, hierarchical:

- **PLATFORM_ADMIN**: Owner of OPORA. Sees all tenants. Manages plans, blocks orgs. Can impersonate any org via `X-Org-Id` header.
- **ORG_ADMIN**: Admin of one organization. Creates users, manages settings, integrations, field mappings. Sees all data within their org.
- **USER**: Regular employee. Works with visits (only their own), companies, contacts within their org.

### 2.3 Access Matrix

| Action | PLATFORM_ADMIN | ORG_ADMIN | USER |
| --- | --- | --- | --- |
| Platform panel (/platform/*) | yes | no | no |
| See all tenants | yes | no | no |
| Block orgs / change plans | yes | no | no |
| Org settings | any org | own org | no |
| Create users | any org | own org | no |
| Send invitations | any org | own org | no |
| Bitrix24 integration | any org | own org | no |
| Field mappings | any org | own org | no |
| CRUD visits | any org | own org (all) | own org (own visits only) |
| CRUD companies/contacts | any org | own org | own org |
| View other users' visits | any org | own org | no |

### 2.4 FastAPI Dependencies

```python
async def get_current_user(token) -> User
    # Decodes JWT, returns User with organization_id and role

async def get_tenant(user) -> TenantContext
    # Returns TenantContext(organization_id, user_id, role)

async def require_org_admin(user) -> User
    # 403 if role not in [ORG_ADMIN, PLATFORM_ADMIN]

async def require_platform_admin(user) -> User
    # 403 if role != PLATFORM_ADMIN
```

## 3. Registration & Onboarding

### 3.1 Self-Registration (new org)

**Endpoint**: `POST /api/auth/register-org`

**Request**:
```json
{
  "first_name": "Иван",
  "last_name": "Петров",
  "email": "ivan@company.ru",
  "password": "...",
  "company_name": "ООО Ромашка"
}
```

**What happens (single transaction)**:
1. Create Organization (name, slug=auto, plan=FREE, plan_limits=default)
2. Create User (email, password, role=ORG_ADMIN, organization_id=new org)
3. Set Organization.owner_id = new user
4. Return JWT token

User lands in an empty tenant dashboard, ready to work.

### 3.2 Adding Employees

**Method 1 — Manual creation** (org_admin panel):

`POST /api/users/` with `{ email, password, first_name, last_name, role }`

Backend auto-sets `organization_id` from JWT. Employee logs in with email+password.

**Method 2 — Email invitation** (org_admin):

`POST /api/invitations/` with `{ email, role }`

1. Creates Invitation record (token, expires_at=+7 days)
2. Sends email with link: `myopora.ru/invite/{token}`
3. Employee opens link → "Set your password" form
4. `POST /api/auth/accept-invite` with `{ token, password, first_name, last_name }`
5. Creates User, sets Invitation.accepted_at

Email sending via SMTP (config in .env). Can start with manual-only and add invitations as phase 2.

### 3.3 Login

Existing `POST /api/auth/login` (email+password) — unchanged flow but JWT now includes `organization_id` and `role`.

## 4. Data Isolation

### 4.1 Tenant Context Middleware

Every protected request goes through:

```
Request → JWT decode → User → TenantContext(organization_id, user_id, role) → Service → DB
```

TenantContext is a FastAPI dependency injected into every tenant-scoped router.

### 4.2 Query Scoping in Services

Every service method that reads data applies `organization_id` filter:

```python
# Read: always filter by org
query = select(Visit).where(Visit.organization_id == tenant.organization_id)

# For USER role, also filter by user_id:
if tenant.role == "USER":
    query = query.where(Visit.user_id == tenant.user_id)

# Create: auto-set organization_id
visit = Visit(**data, organization_id=tenant.organization_id)
```

### 4.3 Tables and Their Scoping

| Table | Filter | USER restriction |
| --- | --- | --- |
| visits | org_id | + user_id (own only) |
| companies | org_id | — |
| contacts | org_id | — |
| doctors | org_id | — |
| field_mappings | org_id | — |
| network_clinics | org_id | — |
| custom_sections | org_id | — |
| org_settings | org_id | — |
| users | org_id | only self |
| invitations | org_id | — |

### 4.4 Platform Admin Bypass

Platform admin operates in two modes:

1. **Platform panel** (`/api/platform/*`) — no org scoping, cross-tenant queries
2. **Org impersonation** — header `X-Org-Id: 7` overrides `organization_id` in TenantContext. Only PLATFORM_ADMIN can use this.

### 4.5 Future Hardening: PostgreSQL RLS

Not implemented in phase 1. Can be added later:

```sql
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON visits
    USING (organization_id = current_setting('app.current_org_id')::int);
```

Backend sets `app.current_org_id` per-connection before executing queries.

## 5. Plans & Limits

### 5.1 Plan Definitions

| | FREE | PRO |
| --- | --- | --- |
| Users | 3 | Unlimited |
| Visits/month | 100 | Unlimited |
| Bitrix24 integration | No | Yes |
| Email invitations | No | Yes |
| Price | 0 ₽ | 990 ₽/user/month |

### 5.2 Limit Enforcement

Limits stored in `Organization.plan_limits` (JSONB). Checked at:

- **User creation**: count users in org vs `max_users`
- **Visit creation**: count visits this month vs `max_visits_per_month`
- **Feature access**: check `plan` for Bitrix24, invitations

Returns HTTP 403 with clear message: "Лимит тарифа Free: максимум 3 пользователя. Перейдите на Pro."

### 5.3 Billing

Not implemented in this spec. Structure is ready: `Organization.plan` can be changed via platform admin or future payment integration.

## 6. Frontend Changes

### 6.1 New Pages

- `/register` — org registration form (self-service)
- `/invite/:token` — accept invitation form
- `/platform/organizations` — platform admin: org list (PLATFORM_ADMIN only)
- `/platform/organizations/:id` — platform admin: org details

### 6.2 Navigation Changes

- Sidebar shows org name at the top
- ORG_ADMIN sees: Settings, Users, Invitations in admin section
- PLATFORM_ADMIN sees: additional "Платформа" section with org management
- USER sees: only operational pages (Visits, Companies, Contacts)

### 6.3 Frontend Auth Flow

1. JWT stored in localStorage (unchanged)
2. After login, decode JWT → extract `organization_id`, `role`
3. Store in AuthContext alongside user info
4. All API calls use existing axios interceptor (JWT in header)
5. Frontend conditionally shows UI based on `role`

## 7. API Endpoints Summary

### New Endpoints

```
POST /api/auth/register-org          — self-register org + admin user
POST /api/auth/accept-invite         — accept invitation, create user
POST /api/invitations/               — create invitation (org_admin)
GET  /api/invitations/               — list pending invitations (org_admin)
DELETE /api/invitations/:id          — cancel invitation (org_admin)
GET  /api/platform/organizations     — list all orgs (platform_admin)
GET  /api/platform/organizations/:id — org details (platform_admin)
PUT  /api/platform/organizations/:id — update plan, block (platform_admin)
GET  /api/platform/stats             — platform stats (platform_admin)
```

### Modified Endpoints (all existing)

Every existing endpoint gains tenant scoping via TenantContext dependency. No URL changes — isolation is transparent.

## 8. Migration Strategy

### Phase 1: Database schema
1. Alembic migration: extend Organization, add new columns to User
2. Add `organization_id NOT NULL` to all tenant-scoped tables
3. Create `invitations` table
4. Data migration: create default org, assign all existing users/data to it
5. Migrate `is_admin` → `role`, drop `is_admin`

### Phase 2: Backend tenant isolation
1. Create TenantContext, dependencies
2. Update all services to accept and apply TenantContext
3. Add register-org, accept-invite endpoints
4. Add platform admin endpoints
5. Plan limit enforcement

### Phase 3: Frontend
1. Registration page
2. Invitation accept page
3. Platform admin panel
4. Role-based navigation/UI
5. Org name in sidebar

## 9. Testing Strategy

- **Unit tests**: TenantContext correctly scopes queries
- **Integration tests**: User in org A cannot see org B data
- **Endpoint tests**: register-org flow, invite flow, login flow
- **Role tests**: USER cannot access admin endpoints, ORG_ADMIN cannot access platform endpoints
- **Limit tests**: FREE plan enforces user/visit limits
