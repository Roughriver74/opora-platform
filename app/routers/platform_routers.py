"""
Platform-admin-only endpoints for managing organizations across the platform.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.models import Organization, User, Visit
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import require_platform_admin

router = APIRouter()


# ---- Schemas ----

class OrgResponse(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    plan: str
    plan_limits: Optional[dict] = None
    is_active: bool
    owner_id: Optional[int] = None
    user_count: int = 0
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    plan_limits: Optional[dict] = None
    is_active: Optional[bool] = None
    bitrix24_webhook_url: Optional[str] = None


class PlatformStats(BaseModel):
    total_organizations: int
    total_users: int
    total_visits: int
    active_organizations: int


# ---- Endpoints ----

@router.get("/organizations", response_model=List[OrgResponse])
async def list_organizations(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_platform_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """List all organizations with user counts (platform_admin only)."""
    session = uow.session

    # Subquery for user count per org
    user_count_sq = (
        select(
            User.organization_id,
            func.count(User.id).label("user_count"),
        )
        .group_by(User.organization_id)
        .subquery()
    )

    query = (
        select(Organization, func.coalesce(user_count_sq.c.user_count, 0).label("user_count"))
        .outerjoin(user_count_sq, Organization.id == user_count_sq.c.organization_id)
        .order_by(Organization.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    rows = (await session.execute(query)).all()
    result = []
    for org, uc in rows:
        result.append(
            OrgResponse(
                id=org.id,
                name=org.name,
                slug=org.slug,
                plan=org.plan or "free",
                plan_limits=org.plan_limits,
                is_active=org.is_active,
                owner_id=org.owner_id,
                user_count=uc,
                created_at=org.created_at.isoformat() if org.created_at else None,
            )
        )
    return result


@router.get("/organizations/{org_id}", response_model=OrgResponse)
async def get_organization(
    org_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_platform_admin),
):
    """Get organization details with user count (platform_admin only)."""
    session = uow.session

    org = (
        (await session.execute(select(Organization).where(Organization.id == org_id)))
        .scalars()
        .first()
    )
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена",
        )

    user_count = await session.scalar(
        select(func.count(User.id)).where(User.organization_id == org_id)
    )

    return OrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        plan=org.plan or "free",
        plan_limits=org.plan_limits,
        is_active=org.is_active,
        owner_id=org.owner_id,
        user_count=user_count or 0,
        created_at=org.created_at.isoformat() if org.created_at else None,
    )


@router.put("/organizations/{org_id}", response_model=OrgResponse)
async def update_organization(
    org_id: int,
    data: OrgUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_platform_admin),
):
    """Update an organization's plan, limits, or active status (platform_admin only)."""
    session = uow.session

    org = (
        (await session.execute(select(Organization).where(Organization.id == org_id)))
        .scalars()
        .first()
    )
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена",
        )

    if data.name is not None:
        org.name = data.name
    if data.plan is not None:
        org.plan = data.plan
    if data.plan_limits is not None:
        org.plan_limits = data.plan_limits
    if data.is_active is not None:
        org.is_active = data.is_active
    if data.bitrix24_webhook_url is not None:
        org.bitrix24_webhook_url = data.bitrix24_webhook_url

    await session.commit()
    await session.refresh(org)

    user_count = await session.scalar(
        select(func.count(User.id)).where(User.organization_id == org_id)
    )

    return OrgResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        plan=org.plan or "free",
        plan_limits=org.plan_limits,
        is_active=org.is_active,
        owner_id=org.owner_id,
        user_count=user_count or 0,
        created_at=org.created_at.isoformat() if org.created_at else None,
    )


@router.get("/stats", response_model=PlatformStats)
async def platform_stats(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_platform_admin),
):
    """Get platform-wide statistics (platform_admin only)."""
    session = uow.session

    total_orgs = await session.scalar(select(func.count(Organization.id))) or 0
    active_orgs = await session.scalar(
        select(func.count(Organization.id)).where(Organization.is_active.is_(True))
    ) or 0
    total_users = await session.scalar(select(func.count(User.id))) or 0
    total_visits = await session.scalar(select(func.count(Visit.id))) or 0

    return PlatformStats(
        total_organizations=total_orgs,
        total_users=total_users,
        total_visits=total_visits,
        active_organizations=active_orgs,
    )
