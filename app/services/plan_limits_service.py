"""Проверка тарифных лимитов для организации.

Универсальные функции, используемые из разных сервисов.
Все функции принимают async SQLAlchemy session и org_id.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select
from starlette import status

from app.models import Company, Organization, User, Visit

MSK = ZoneInfo("Europe/Moscow")


async def _get_org(session, org_id: int) -> Organization | None:
    """Загружает организацию по ID. Возвращает None, если не найдена."""
    return await session.get(Organization, org_id)


async def check_users_limit(session, org_id: int) -> None:
    """Проверяет лимит пользователей для организации.

    Применяется ко ВСЕМ планам у которых задан max_users в plan_limits.
    Если лимит не задан — пропускает без ошибки.

    Raises:
        HTTPException 403 — если лимит исчерпан.
    """
    org = await _get_org(session, org_id)
    if not org:
        return

    max_users = (org.plan_limits or {}).get("max_users")
    if max_users is None:
        return  # лимит не задан — разрешено

    current = await session.scalar(
        select(func.count(User.id)).where(User.organization_id == org_id)
    )
    if (current or 0) >= max_users:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Достигнут лимит пользователей на тарифе «{org.plan}» ({max_users}). "
                "Обновите тариф."
            ),
        )


async def check_companies_limit(session, org_id: int) -> None:
    """Проверяет лимит компаний для организации.

    Применяется ко всем планам у которых задан max_companies в plan_limits.
    Если лимит не задан — пропускает без ошибки.

    Raises:
        HTTPException 403 — если лимит исчерпан.
    """
    org = await _get_org(session, org_id)
    if not org:
        return

    max_companies = (org.plan_limits or {}).get("max_companies")
    if max_companies is None:
        return  # лимит не задан — разрешено

    current = await session.scalar(
        select(func.count(Company.id)).where(Company.organization_id == org_id)
    )
    if (current or 0) >= max_companies:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Достигнут лимит компаний на тарифе «{org.plan}» ({max_companies}). "
                "Обновите тариф."
            ),
        )


async def check_visits_monthly_limit(session, org_id: int) -> None:
    """Проверяет лимит визитов в текущем месяце для организации.

    Применяется ко всем планам у которых задан max_visits_per_month в plan_limits.
    Если лимит не задан — пропускает без ошибки.

    Raises:
        HTTPException 403 — если лимит исчерпан.
    """
    org = await _get_org(session, org_id)
    if not org:
        return

    max_visits = (org.plan_limits or {}).get("max_visits_per_month")
    if max_visits is None:
        return  # лимит не задан — разрешено

    now = datetime.now(MSK)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    current = await session.scalar(
        select(func.count(Visit.id))
        .where(Visit.organization_id == org_id)
        .where(Visit.date >= month_start)
    )
    if (current or 0) >= max_visits:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Достигнут лимит визитов в месяц на тарифе «{org.plan}» ({max_visits}). "
                "Обновите тариф."
            ),
        )
