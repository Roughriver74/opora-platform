"""
Эндпоинты для просмотра аудит-лога.
Доступно только org_admin и platform_admin.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select

from app.models import AuditLog
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["Аудит"])


@router.get("/logs")
async def get_audit_logs(
    page: int = Query(default=1, ge=1, description="Номер страницы"),
    page_size: int = Query(default=50, ge=1, le=100, description="Записей на странице"),
    action: Optional[str] = Query(default=None, description="Фильтр по действию: login, create, update, delete, export"),
    entity_type: Optional[str] = Query(default=None, description="Фильтр по типу сущности: visit, company, user, contact"),
    current_user=Depends(get_current_admin_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Возвращает аудит-лог текущей организации.
    Platform admin видит события только своей org (или может использовать X-Org-Id header через get_tenant).
    """
    org_id = current_user.organization_id

    base_query = (
        select(AuditLog)
        .where(AuditLog.organization_id == org_id)
        .order_by(desc(AuditLog.created_at))
    )

    if action:
        base_query = base_query.where(AuditLog.action == action)
    if entity_type:
        base_query = base_query.where(AuditLog.entity_type == entity_type)

    # Подсчёт общего числа записей
    count_query = select(func.count()).select_from(base_query.subquery())
    total = await uow.session.scalar(count_query)

    # Пагинация
    result = await uow.session.execute(
        base_query.offset((page - 1) * page_size).limit(page_size)
    )
    logs = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "user_id": log.user_id,
                "user_email": log.user_email,
                "details": log.details,
                "ip_address": log.ip_address,
                "request_id": log.request_id,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }
