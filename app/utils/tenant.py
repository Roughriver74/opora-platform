"""
Multi-tenancy utilities for future use.
Currently not enforced — organization_id columns are nullable.
"""

from sqlalchemy import Select


def scope_to_org(query: Select, model, org_id: int | None = None) -> Select:
    """
    Scope a SQLAlchemy query to a specific organization.
    If org_id is None, returns the original query (no scoping).
    """
    if org_id is not None and hasattr(model, "organization_id"):
        return query.filter(model.organization_id == org_id)
    return query
