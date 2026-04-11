"""
Platform-admin-only endpoints for managing organizations across the platform.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.config import Settings
from app.models import Organization, User, Visit
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import require_platform_admin

logger = logging.getLogger(__name__)

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


class PlatformUserResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    is_active: bool
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class PlatformStats(BaseModel):
    total_organizations: int
    total_users: int
    total_visits: int
    active_organizations: int
    new_organizations_last_30d: int
    new_users_last_30d: int
    paid_organizations: int


class OrgDetailsResponse(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    plan: str
    plan_limits: Optional[dict] = None
    is_active: bool
    owner_id: Optional[int] = None
    api_key: Optional[str] = None
    bitrix24_webhook_url: Optional[str] = None
    created_at: Optional[str] = None
    user_count: int = 0
    visit_count: int = 0
    users: List[PlatformUserResponse] = []

    class Config:
        from_attributes = True


class SmtpStatusResponse(BaseModel):
    configured: bool
    host: str
    from_email: str


class SmtpTestResponse(BaseModel):
    success: bool
    message: str


# ---- Bootstrap ----

class InitAdminRequest(BaseModel):
    email: str
    password: str
    token: str


@router.post("/init-admin", response_model=dict)
async def init_platform_admin(data: InitAdminRequest, uow: UnitOfWork = Depends(get_uow)):
    """
    Bootstrap: создать первого platform_admin.
    Работает ТОЛЬКО если:
      1. PLATFORM_ADMIN_TOKEN задан в env
      2. data.token совпадает с PLATFORM_ADMIN_TOKEN
      3. В БД ещё нет ни одного platform_admin
    """
    if not Settings.PLATFORM_ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Platform admin creation is disabled")
    if data.token != Settings.PLATFORM_ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")

    session = uow.session
    existing = (
        (await session.execute(select(User).where(User.role == "platform_admin")))
        .scalars()
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Platform admin already exists")

    user = User(
        email=data.email,
        role="platform_admin",
        is_active=True,
        organization_id=None,
    )
    user.set_password(data.password)
    session.add(user)
    await session.commit()
    logger.info("Platform admin created: %s", data.email)
    return {"detail": "Platform admin created", "email": data.email}


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


@router.get("/organizations/{org_id}/details", response_model=OrgDetailsResponse)
async def get_org_details(
    org_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_platform_admin),
):
    """Get detailed organization info with users and stats (platform_admin only)."""
    session = uow.session

    org = (
        (await session.execute(select(Organization).where(Organization.id == org_id)))
        .scalars()
        .first()
    )
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Организация не найдена")

    users = (
        (
            await session.execute(
                select(User)
                .where(User.organization_id == org_id)
                .order_by(User.created_at.desc())
            )
        )
        .scalars()
        .all()
    )

    visit_count = await session.scalar(
        select(func.count(Visit.id)).where(Visit.organization_id == org_id)
    ) or 0

    # Mask sensitive fields
    webhook = org.bitrix24_webhook_url
    if webhook and len(webhook) > 20:
        webhook = webhook[:20] + "***"

    api_key = org.api_key
    if api_key and len(api_key) > 8:
        api_key = api_key[:8] + "***"

    return OrgDetailsResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        plan=org.plan or "free",
        plan_limits=org.plan_limits,
        is_active=org.is_active,
        owner_id=org.owner_id,
        api_key=api_key,
        bitrix24_webhook_url=webhook,
        created_at=org.created_at.isoformat() if org.created_at else None,
        user_count=len(users),
        visit_count=visit_count,
        users=[
            PlatformUserResponse(
                id=u.id,
                email=u.email,
                first_name=u.first_name,
                last_name=u.last_name,
                role=u.role,
                is_active=u.is_active,
                organization_id=u.organization_id,
                organization_name=org.name,
                created_at=u.created_at.isoformat() if u.created_at else None,
            )
            for u in users
        ],
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

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    new_orgs = await session.scalar(
        select(func.count(Organization.id)).where(Organization.created_at >= thirty_days_ago)
    ) or 0
    new_users = await session.scalar(
        select(func.count(User.id)).where(
            User.created_at >= thirty_days_ago,
            User.role != "platform_admin",
        )
    ) or 0
    paid_orgs = await session.scalar(
        select(func.count(Organization.id)).where(
            Organization.is_active.is_(True),
            Organization.plan != "free",
        )
    ) or 0

    return PlatformStats(
        total_organizations=total_orgs,
        total_users=total_users,
        total_visits=total_visits,
        active_organizations=active_orgs,
        new_organizations_last_30d=new_orgs,
        new_users_last_30d=new_users,
        paid_organizations=paid_orgs,
    )


@router.get("/users", response_model=List[PlatformUserResponse])
async def list_all_users(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_platform_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    organization_id: Optional[int] = Query(None),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """List all users across all organizations (platform_admin only)."""
    session = uow.session

    query = (
        select(User, Organization.name.label("org_name"))
        .outerjoin(Organization, User.organization_id == Organization.id)
        .where(User.role != "platform_admin")
    )

    if organization_id is not None:
        query = query.where(User.organization_id == organization_id)
    if role:
        query = query.where(User.role == role)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                User.email.ilike(search_term),
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
            )
        )

    query = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await session.execute(query)).all()

    return [
        PlatformUserResponse(
            id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            role=u.role,
            is_active=u.is_active,
            organization_id=u.organization_id,
            organization_name=org_name,
            created_at=u.created_at.isoformat() if u.created_at else None,
        )
        for u, org_name in rows
    ]


# ---- SMTP Settings Endpoints ----


@router.get("/smtp-status", response_model=SmtpStatusResponse)
async def smtp_status(
    current_user: User = Depends(require_platform_admin),
):
    """Get SMTP configuration status (platform_admin only)."""
    configured = bool(Settings.SMTP_HOST and Settings.SMTP_USER and Settings.SMTP_PASSWORD)

    # Mask the host: show first part, mask the rest (e.g. "smtp.***")
    host = Settings.SMTP_HOST
    if host:
        parts = host.split(".", 1)
        if len(parts) > 1:
            host = f"{parts[0]}.***"
        # If it's a single-part host, show it as-is
    else:
        host = ""

    return SmtpStatusResponse(
        configured=configured,
        host=host,
        from_email=Settings.SMTP_FROM or "",
    )


@router.post("/smtp-test", response_model=SmtpTestResponse)
async def smtp_test(
    current_user: User = Depends(require_platform_admin),
):
    """Send a test email to the current admin's email (platform_admin only)."""
    from app.services.email_service import _is_smtp_configured, _send_email, _wrap_html

    if not _is_smtp_configured():
        return SmtpTestResponse(
            success=False,
            message="SMTP не настроен. Задайте переменные SMTP_HOST, SMTP_USER, SMTP_PASSWORD в .env файле на сервере.",
        )

    to_email = current_user.email
    if not to_email:
        return SmtpTestResponse(
            success=False,
            message="У вашего аккаунта не указан email.",
        )

    subject = "ОПОРА — Тестовое письмо"
    inner_html = """\
  <div class="body">
    <h2>Тестовое письмо</h2>
    <p>
      Если вы видите это письмо, значит SMTP настроен корректно
      и платформа ОПОРА может отправлять email-уведомления.
    </p>
    <p style="color:#94a3b8; font-size:13px;">
      Это автоматическое тестовое сообщение из панели администратора.
    </p>
  </div>"""

    html_body = _wrap_html(inner_html)
    text_body = (
        "Тестовое письмо\n\n"
        "Если вы видите это письмо, значит SMTP настроен корректно "
        "и платформа ОПОРА может отправлять email-уведомления.\n\n"
        "---\nЭто автоматическое тестовое сообщение из панели администратора."
    )

    try:
        success = await _send_email(to_email, subject, html_body, text_body)
        if success:
            return SmtpTestResponse(
                success=True,
                message=f"Тестовое письмо успешно отправлено на {to_email}",
            )
        else:
            return SmtpTestResponse(
                success=False,
                message="Не удалось отправить письмо. Проверьте настройки SMTP и логи сервера.",
            )
    except Exception as e:
        logger.exception("SMTP test failed")
        return SmtpTestResponse(
            success=False,
            message=f"Ошибка при отправке: {str(e)}",
        )
