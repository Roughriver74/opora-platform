"""Analytics API endpoints.

Предоставляет агрегированную статистику по организации:
- сводка за текущий/прошлый месяц,
- визиты по дням,
- топ пользователей по визитам.

Все данные изолированы по organization_id текущего пользователя.
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.models import Company, Organization, User, Visit
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter(prefix="/analytics", tags=["Аналитика"])

MSK = ZoneInfo("Europe/Moscow")


@router.get("/summary")
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Сводная статистика организации за текущий и прошлый месяц."""
    org_id = current_user.organization_id
    now = datetime.now(MSK)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_start = (month_start - timedelta(days=1)).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    session = uow.session

    # Визиты за текущий месяц
    visits_this_month = await session.scalar(
        select(func.count(Visit.id))
        .where(Visit.organization_id == org_id)
        .where(Visit.date >= month_start)
    ) or 0

    # Визиты за прошлый месяц
    visits_prev_month = await session.scalar(
        select(func.count(Visit.id))
        .where(Visit.organization_id == org_id)
        .where(Visit.date >= prev_month_start)
        .where(Visit.date < month_start)
    ) or 0

    # Активные пользователи (хотя бы 1 визит в текущем месяце)
    active_users = await session.scalar(
        select(func.count(func.distinct(Visit.user_id)))
        .where(Visit.organization_id == org_id)
        .where(Visit.date >= month_start)
    ) or 0

    # Всего компаний
    total_companies = await session.scalar(
        select(func.count(Company.id)).where(Company.organization_id == org_id)
    ) or 0

    # Всего пользователей
    total_users = await session.scalar(
        select(func.count(User.id)).where(User.organization_id == org_id)
    ) or 0

    # Статусы визитов за текущий месяц
    status_rows = await session.execute(
        select(Visit.status, func.count(Visit.id).label("cnt"))
        .where(Visit.organization_id == org_id)
        .where(Visit.date >= month_start)
        .group_by(Visit.status)
    )
    visits_by_status = {row.status: row.cnt for row in status_rows}

    # Лимиты и тарифный план организации
    org = await session.get(Organization, org_id)
    plan = org.plan if org else "free"
    plan_limits = org.plan_limits if org else {}

    # Прирост визитов в %
    visits_growth_pct = round(
        (visits_this_month - visits_prev_month) / max(visits_prev_month, 1) * 100, 1
    )

    return {
        "visits_this_month": visits_this_month,
        "visits_prev_month": visits_prev_month,
        "visits_growth_pct": visits_growth_pct,
        "active_users_this_month": active_users,
        "total_companies": total_companies,
        "total_users": total_users,
        "visits_by_status": visits_by_status,
        "plan": plan,
        "plan_limits": plan_limits,
    }


@router.get("/visits-by-day")
async def get_visits_by_day(
    days: int = Query(default=30, ge=7, le=90, description="Количество дней"),
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Визиты по дням за последние N дней (7–90)."""
    org_id = current_user.organization_id
    since = datetime.now(MSK) - timedelta(days=days)

    result = await uow.session.execute(
        select(
            func.date_trunc("day", Visit.date).label("day"),
            func.count(Visit.id).label("cnt"),
        )
        .where(Visit.organization_id == org_id)
        .where(Visit.date >= since)
        .group_by(func.date_trunc("day", Visit.date))
        .order_by(func.date_trunc("day", Visit.date))
    )

    return [
        {"date": row.day.strftime("%Y-%m-%d"), "count": row.cnt}
        for row in result
    ]


@router.get("/top-users")
async def get_top_users(
    days: int = Query(default=30, ge=7, le=90, description="Количество дней"),
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Топ-10 пользователей по количеству визитов за последние N дней."""
    org_id = current_user.organization_id
    since = datetime.now(MSK) - timedelta(days=days)

    result = await uow.session.execute(
        select(
            User.id,
            User.email,
            User.first_name,
            User.last_name,
            func.count(Visit.id).label("visits_count"),
        )
        .join(Visit, Visit.user_id == User.id)
        .where(Visit.organization_id == org_id)
        .where(Visit.date >= since)
        .group_by(User.id, User.email, User.first_name, User.last_name)
        .order_by(func.count(Visit.id).desc())
        .limit(10)
    )

    return [
        {
            "user_id": row.id,
            "email": row.email,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "visits_count": row.visits_count,
        }
        for row in result
    ]
