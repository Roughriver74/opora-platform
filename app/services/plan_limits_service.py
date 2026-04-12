"""Проверка тарифных лимитов для организации.

Универсальные функции, используемые из разных сервисов.
Все функции принимают async SQLAlchemy session и org_id.
"""
import copy
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, select
from starlette import status

from app.models import Company, Organization, User, Visit

MSK = ZoneInfo("Europe/Moscow")

DEFAULT_PLAN_LIMITS = {
    "free": {
        "max_users": 5,
        "max_companies": 20,
        "max_visits_per_month": 100,
        "max_forms": 1,
        "max_fields_per_form": 5,
        "max_photos_per_visit": 3,
        "custom_checklists": False,
        "analytics_export": False,
        "integrations": [],
        "api_enabled": False,
        "white_label": False,
    },
    "pro": {
        "max_users": 50,
        "max_companies": None,
        "max_visits_per_month": None,
        "max_forms": None,
        "max_fields_per_form": None,
        "max_photos_per_visit": 20,
        "custom_checklists": True,
        "analytics_export": True,
        "integrations": ["bitrix24"],
        "api_enabled": False,
        "white_label": False,
    },
    "business": {
        "max_users": None,
        "max_companies": None,
        "max_visits_per_month": None,
        "max_forms": None,
        "max_fields_per_form": None,
        "max_photos_per_visit": None,
        "custom_checklists": True,
        "analytics_export": True,
        "integrations": ["bitrix24", "webhooks", "api"],
        "api_enabled": True,
        "white_label": True,
    },
}


def get_plan_limits(plan: str, overrides: dict | None = None) -> dict:
    """Возвращает лимиты тарифа с учётом переопределений из org.plan_limits."""
    defaults = copy.deepcopy(DEFAULT_PLAN_LIMITS.get(plan, DEFAULT_PLAN_LIMITS["free"]))
    if overrides:
        defaults.update(overrides)
    return defaults


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


async def check_photos_limit(session, org_id: int, visit_id: int) -> None:
    """Проверяет лимит фото на визит."""
    org = await _get_org(session, org_id)
    if not org:
        return
    limits = get_plan_limits(org.plan, org.plan_limits)
    max_photos = limits.get("max_photos_per_visit")
    if max_photos is None:
        return
    from app.models import VisitPhoto
    count = await session.scalar(
        select(func.count(VisitPhoto.id)).where(
            VisitPhoto.visit_id == visit_id,
            VisitPhoto.organization_id == org_id,
        )
    )
    if (count or 0) >= max_photos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Лимит фотографий на визит: {max_photos}. Перейдите на тариф Pro для увеличения лимита.",
        )


async def check_forms_limit(session, org_id: int) -> None:
    """Проверяет лимит форм."""
    org = await _get_org(session, org_id)
    if not org:
        return
    limits = get_plan_limits(org.plan, org.plan_limits)
    max_forms = limits.get("max_forms")
    if max_forms is None:
        return
    from app.models import FormTemplate
    count = await session.scalar(
        select(func.count(FormTemplate.id)).where(
            FormTemplate.organization_id == org_id,
        )
    )
    if (count or 0) >= max_forms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Лимит форм: {max_forms}. Перейдите на тариф Pro для создания дополнительных форм.",
        )
