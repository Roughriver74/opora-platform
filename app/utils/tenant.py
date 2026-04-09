"""
Multi-tenancy utilities.
TenantContext holds the current request's organization scope.
scope_to_org applies organization_id filtering to SQLAlchemy queries.
"""

from dataclasses import dataclass

from sqlalchemy import Select


@dataclass
class TenantContext:
    organization_id: int
    user_id: int
    role: str  # "platform_admin", "org_admin", "user"

    @property
    def is_platform_admin(self) -> bool:
        return self.role == "platform_admin"

    @property
    def is_org_admin(self) -> bool:
        return self.role in ("org_admin", "platform_admin")


def scope_to_org(query: Select, model, org_id: int | None = None) -> Select:
    """
    Scope a SQLAlchemy query to a specific organization.
    If org_id is None, returns the original query (no scoping).
    """
    if org_id is not None and hasattr(model, "organization_id"):
        return query.filter(model.organization_id == org_id)
    return query
