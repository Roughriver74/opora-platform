# Multi-Tenancy Phase 1: Database Schema & Models

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate database schema from single-tenant to multi-tenant with row-level isolation. All tenant-scoped tables get `organization_id NOT NULL`. Role system replaces `is_admin` boolean. Invitation table created.

**Architecture:** Alembic migration extends existing Organization model, adds `role` enum to User, adds `organization_id` to all tenant tables, creates invitations table. Data migration assigns all existing data to a default organization.

**Tech Stack:** SQLAlchemy 2.0, Alembic, PostgreSQL 14, Python 3.11+

**Spec:** `docs/superpowers/specs/2026-04-09-multi-tenancy-design.md`

---

### Task 1: Add role enum and update models.py

**Files:**
- Create: `app/enums/role_enum.py`
- Modify: `app/models.py`

- [ ] **Step 1: Create role enum file**

Create `app/enums/role_enum.py`:

```python
import enum


class UserRole(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"
    ORG_ADMIN = "org_admin"
    USER = "user"


class OrgPlan(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
```

- [ ] **Step 2: Update Organization model in models.py**

In `app/models.py`, replace the existing `Organization` class (lines 26-39) with:

```python
class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    plan = Column(String, default="free")
    plan_limits = Column(JSONB, default={"max_users": 3, "max_visits_per_month": 100})
    bitrix24_webhook_url = Column(String, nullable=True)
    bitrix24_smart_process_visit_id = Column(Integer, nullable=True)
    settings = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", foreign_keys=[owner_id], post_update=True)
    users = relationship("User", back_populates="organization", foreign_keys="User.organization_id")
```

- [ ] **Step 3: Update User model in models.py**

Replace the `User` class (lines 78-98) with:

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    bitrix_user_id = Column(Integer, unique=True, nullable=True)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    regions = Column(ARRAY(String), default=[])
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization", back_populates="users", foreign_keys=[organization_id])
    visits = relationship("Visit", back_populates="user")

    def set_password(self, password):
        self.hashed_password = pwd_context.hash(password)

    def verify_password(self, password):
        return pwd_context.verify(password, self.hashed_password)

    @property
    def is_admin(self):
        """Backward compatibility — returns True for org_admin and platform_admin"""
        return self.role in ("org_admin", "platform_admin")

    @property
    def is_platform_admin(self):
        return self.role == "platform_admin"

    @property
    def is_org_admin(self):
        return self.role in ("org_admin", "platform_admin")
```

Note: `is_admin` property is kept for backward compatibility with existing code that reads `user.is_admin`. The `is_admin` **column** is removed but the **property** remains.

- [ ] **Step 4: Add organization_id to remaining models**

Add `organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)` to these models in `app/models.py`:

- `Contact` (after `sync_status` line)
- `Doctor` (after `sync_status` line)
- `FieldMapping` (after `sort_order` line)
- `CustomSection` (after `fields` line)
- `NetworkClinic` (after `updated_at` line)
- `ClinicAddress` (after `is_network` line)

Change existing nullable `organization_id` to `nullable=False` on:
- `Company` (line 121)
- `Visit` (line 137)

- [ ] **Step 5: Add Invitation model**

Add to `app/models.py` after the `ClinicAddress` class:

```python
class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, default="user")
    token = Column(String, unique=True, index=True, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    inviter = relationship("User", foreign_keys=[invited_by])
```

- [ ] **Step 6: Add OrgSettings model (keep GlobalSettings for now)**

Add to `app/models.py` after `GlobalSettings`:

```python
class OrgSettings(Base):
    __tablename__ = "org_settings"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    key = Column(String, nullable=False, index=True)
    value = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization")

    __table_args__ = (
        # Unique key per organization
        {"comment": "Per-organization settings"},
    )
```

Keep `GlobalSettings` for now — it will be deprecated but still used by existing code until Phase 2 updates the services.

- [ ] **Step 7: Commit model changes**

```bash
git add app/models.py app/enums/role_enum.py
git commit -m "feat(models): add multi-tenancy models — roles, org extensions, invitations, org_settings"
```

---

### Task 2: Alembic migration — schema changes

**Files:**
- Create: `app/alembic/versions/<auto>_multi_tenancy.py`

- [ ] **Step 1: Generate Alembic migration**

```bash
cd app && alembic revision --autogenerate -m "multi_tenancy_schema"
```

This will auto-detect:
- New columns on Organization (owner_id, plan, plan_limits)
- New columns on User (role, first_name, last_name, invited_by), removed is_admin
- New organization_id columns on Contact, Doctor, FieldMapping, CustomSection, NetworkClinic, ClinicAddress
- Nullable → NOT NULL change on Company.organization_id, Visit.organization_id, User.organization_id
- New tables: invitations, org_settings

- [ ] **Step 2: Edit the generated migration to add data migration**

Open the generated migration file and add data migration logic **between** the schema changes and the NOT NULL constraints. The migration must:

1. First add columns as **nullable**
2. Create default organization
3. Assign all existing data to default org
4. Migrate is_admin → role
5. Then alter columns to NOT NULL
6. Drop is_admin column

Edit the `upgrade()` function to include:

```python
def upgrade() -> None:
    # --- 1. Add new columns as NULLABLE first ---
    # Organization extensions
    op.add_column('organizations', sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('organizations', sa.Column('plan', sa.String(), server_default='free', nullable=True))
    op.add_column('organizations', sa.Column('plan_limits', postgresql.JSONB(), server_default='{"max_users": 3, "max_visits_per_month": 100}', nullable=True))

    # User extensions
    op.add_column('users', sa.Column('role', sa.String(), server_default='user', nullable=True))
    op.add_column('users', sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('invited_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))

    # organization_id on tables that don't have it yet
    op.add_column('contacts', sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True))
    op.add_column('doctors', sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True))
    op.add_column('field_mappings', sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True))
    op.add_column('custom_sections', sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True))
    op.add_column('network_clinic', sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True))
    op.add_column('company_address', sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True))

    # Create new tables
    op.create_table('org_settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('key', sa.String(), nullable=False, index=True),
        sa.Column('value', sa.String(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
    )

    op.create_table('invitations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('role', sa.String(), server_default='user'),
        sa.Column('token', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('invited_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- 2. Data migration ---
    conn = op.get_bind()

    # Create default organization if none exists
    result = conn.execute(sa.text("SELECT id FROM organizations LIMIT 1"))
    default_org = result.fetchone()
    if not default_org:
        conn.execute(sa.text("""
            INSERT INTO organizations (name, slug, plan, plan_limits, is_active, created_at)
            VALUES ('Default Organization', 'default', 'free', '{"max_users": 3, "max_visits_per_month": 100}', true, NOW())
        """))
        result = conn.execute(sa.text("SELECT id FROM organizations WHERE slug = 'default'"))
        default_org = result.fetchone()

    default_org_id = default_org[0]

    # Assign all unassigned data to default org
    for table in ['users', 'companies', 'visits', 'contacts', 'doctors', 'field_mappings', 'custom_sections', 'network_clinic', 'company_address']:
        conn.execute(sa.text(f"UPDATE {table} SET organization_id = :org_id WHERE organization_id IS NULL"), {"org_id": default_org_id})

    # Migrate is_admin → role
    conn.execute(sa.text("UPDATE users SET role = 'org_admin' WHERE is_admin = true"))
    conn.execute(sa.text("UPDATE users SET role = 'user' WHERE is_admin = false OR is_admin IS NULL"))

    # Set first user as platform_admin (owner of the platform)
    conn.execute(sa.text("UPDATE users SET role = 'platform_admin' WHERE id = (SELECT MIN(id) FROM users)"))

    # Set default org owner
    conn.execute(sa.text("""
        UPDATE organizations SET owner_id = (SELECT MIN(id) FROM users WHERE organization_id = :org_id)
        WHERE id = :org_id
    """), {"org_id": default_org_id})

    # --- 3. Now make columns NOT NULL ---
    op.alter_column('users', 'organization_id', nullable=False)
    op.alter_column('users', 'role', nullable=False, server_default=None)
    op.alter_column('companies', 'organization_id', nullable=False)
    op.alter_column('visits', 'organization_id', nullable=False)
    op.alter_column('contacts', 'organization_id', nullable=False)
    op.alter_column('doctors', 'organization_id', nullable=False)
    op.alter_column('field_mappings', 'organization_id', nullable=False)
    op.alter_column('custom_sections', 'organization_id', nullable=False)
    op.alter_column('network_clinic', 'organization_id', nullable=False)
    op.alter_column('company_address', 'organization_id', nullable=False)

    # --- 4. Drop is_admin column ---
    op.drop_column('users', 'is_admin')

    # --- 5. Add indexes for organization_id ---
    op.create_index('ix_users_organization_id', 'users', ['organization_id'])
    op.create_index('ix_companies_organization_id', 'companies', ['organization_id'])
    op.create_index('ix_visits_organization_id', 'visits', ['organization_id'])
    op.create_index('ix_contacts_organization_id', 'contacts', ['organization_id'])
    op.create_index('ix_doctors_organization_id', 'doctors', ['organization_id'])
    op.create_index('ix_field_mappings_organization_id', 'field_mappings', ['organization_id'])
```

- [ ] **Step 3: Write the downgrade() function**

```python
def downgrade() -> None:
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false'))
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE users SET is_admin = true WHERE role IN ('org_admin', 'platform_admin')"))
    conn.execute(sa.text("UPDATE users SET is_admin = false WHERE role = 'user'"))

    op.drop_column('users', 'role')
    op.drop_column('users', 'first_name')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'invited_by')

    op.drop_column('organizations', 'owner_id')
    op.drop_column('organizations', 'plan')
    op.drop_column('organizations', 'plan_limits')

    for table in ['contacts', 'doctors', 'field_mappings', 'custom_sections', 'network_clinic', 'company_address']:
        op.drop_column(table, 'organization_id')

    # Make nullable again
    op.alter_column('users', 'organization_id', nullable=True)
    op.alter_column('companies', 'organization_id', nullable=True)
    op.alter_column('visits', 'organization_id', nullable=True)

    op.drop_table('invitations')
    op.drop_table('org_settings')
```

- [ ] **Step 4: Commit migration**

```bash
git add app/alembic/versions/
git commit -m "feat(migration): add multi-tenancy Alembic migration with data migration"
```

---

### Task 3: Update schemas for new role system

**Files:**
- Modify: `app/schemas/auth_schema.py`
- Modify: `app/schemas/users_schema.py`

- [ ] **Step 1: Update auth schemas**

Replace `app/schemas/auth_schema.py`:

```python
from typing import Optional

from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class OrgRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    company_name: str


class AcceptInvite(BaseModel):
    token: str
    password: str
    first_name: str
    last_name: str


class UserResponse(BaseModel):
    email: EmailStr
    bitrix_user_id: Optional[int] = None
    role: str = "user"
    organization_id: Optional[int] = None
    regions: list[str] = []
```

- [ ] **Step 2: Update user schemas**

Read and update `app/schemas/users_schema.py` — replace `is_admin: bool` with `role: str`:

```python
from typing import Optional

from pydantic import BaseModel, EmailStr


class CreateUser(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "user"
    regions: list[str] = []


class UpdateUser(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    regions: Optional[list[str]] = None
```

- [ ] **Step 3: Create invitation schema**

Create `app/schemas/invitation_schema.py`:

```python
from typing import Optional

from pydantic import BaseModel, EmailStr


class CreateInvitation(BaseModel):
    email: EmailStr
    role: str = "user"


class InvitationResponse(BaseModel):
    id: int
    email: str
    role: str
    token: str
    accepted_at: Optional[str] = None
    expires_at: str

    class Config:
        from_attributes = True
```

- [ ] **Step 4: Commit schema changes**

```bash
git add app/schemas/
git commit -m "feat(schemas): update auth/user schemas for roles, add invitation schema"
```

---

### Task 4: Update auth service for role-based JWT

**Files:**
- Modify: `app/services/auth_service.py`
- Modify: `app/routers/auth_routers.py`
- Modify: `app/utils/utils.py`

- [ ] **Step 1: Update auth_service.py — JWT creation and user retrieval**

In `app/services/auth_service.py`, the `create_access_token` is fine. Update `get_current_user` to also load `organization_id` and `role` from the token (they're already in the user object from DB). No change needed for token decode since we read user from DB.

Update `get_current_active_admin_user` to use role:

```python
@logger()
async def get_current_active_admin_user(
    self, token: str = Depends(oauth2_scheme)
) -> User:
    user = await self.get_current_user(token)
    if not user.is_org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return user
```

- [ ] **Step 2: Update auth_routers.py — JWT payload**

In `app/routers/auth_routers.py`, update the `login_for_access_token` function. Change the JWT creation data and login response:

Replace the `access_token` creation line (line 43-44):
```python
    access_token = await uow.auth.create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role,
            "organization_id": user.organization_id,
        },
        expires_delta=access_token_expires,
    )
```

Replace the login response (lines 49-57):
```python
    if request.url.path.endswith("/login"):
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "organization_id": user.organization_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "regions": user.regions or [],
            },
        }
```

- [ ] **Step 3: Update utils.py — role-based dependencies**

Replace `app/utils/utils.py`:

```python
from fastapi import Depends, HTTPException
from starlette import status

from app.models import User
from app.services.auth_service import oauth2_scheme
from app.services.uow import UnitOfWork, get_uow
from app.utils.logger import logger


@logger()
async def get_current_user(
    uow: UnitOfWork = Depends(get_uow), token: str = Depends(oauth2_scheme)
) -> User:
    return await uow.auth.get_current_user(token)


@logger()
async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав доступа"
        )
    return current_user


@logger()
async def require_platform_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора платформы",
        )
    return current_user


@logger()
async def get_current_active_admin_user(
    uow: UnitOfWork = Depends(get_uow), token: str = Depends(oauth2_scheme)
) -> User:
    return await uow.auth.get_current_active_admin_user(token)
```

- [ ] **Step 4: Commit auth changes**

```bash
git add app/services/auth_service.py app/routers/auth_routers.py app/utils/utils.py
git commit -m "feat(auth): role-based JWT with organization_id, platform_admin dependency"
```

---

### Task 5: Update user service for role field

**Files:**
- Modify: `app/services/users_service.py`

- [ ] **Step 1: Update users_service.py**

Replace all `is_admin` references with `role`. Key changes:

- `get_current_user_info`: return `role` instead of `is_admin`
- `get_users`: return `role` instead of `is_admin`
- `create_user`: use `role` instead of `is_admin`
- `update_user`: update `role` instead of `is_admin`

In every response dict, replace `"is_admin": user.is_admin` with `"role": user.role`.

In `create_user`, replace `is_admin=user_data.is_admin` with `role=user_data.role`.

In `update_user`, replace the `is_admin` update block with:
```python
if user_data.role is not None:
    user.role = user_data.role
```

- [ ] **Step 2: Commit**

```bash
git add app/services/users_service.py
git commit -m "feat(users): replace is_admin with role in user service"
```

---

### Task 6: Run migration and verify

- [ ] **Step 1: Start database**

```bash
docker start opora_dev_db || docker run -d --name opora_dev_db -e POSTGRES_USER=opora_user -e POSTGRES_PASSWORD=opora_dev_pass -e POSTGRES_DB=opora_dev -p 4202:5432 postgres:14
```

Wait for DB ready.

- [ ] **Step 2: Run migration**

```bash
cd app && DATABASE_URL=postgresql://opora_user:opora_dev_pass@localhost:4202/opora_dev alembic upgrade head
```

Expected: Migration completes without errors.

- [ ] **Step 3: Verify schema**

```bash
docker exec opora_dev_db psql -U opora_user -d opora_dev -c "\dt"
```

Expected: tables include `invitations`, `org_settings`, all existing tables present.

```bash
docker exec opora_dev_db psql -U opora_user -d opora_dev -c "\d users"
```

Expected: `role` column exists, `is_admin` column gone, `organization_id` NOT NULL.

- [ ] **Step 4: Verify data migration**

```bash
docker exec opora_dev_db psql -U opora_user -d opora_dev -c "SELECT id, name, slug, plan FROM organizations"
docker exec opora_dev_db psql -U opora_user -d opora_dev -c "SELECT id, email, role, organization_id FROM users"
```

Expected: default org exists, all users have organization_id set and role assigned.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 — multi-tenancy database schema migration"
```
