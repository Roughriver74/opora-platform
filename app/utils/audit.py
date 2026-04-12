"""
Утилиты для записи аудит-лога.

Использование:
    await audit_log(session, action="create", entity_type="visit", entity_id=42,
                    user_id=user.id, user_email=user.email, org_id=user.organization_id)

Вызов НЕ делает commit — это обязанность вызывающего кода через UoW.
Никогда не поднимает исключение — ошибки только логируются.
"""
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog
from app.utils.logger import request_id_var

logger = logging.getLogger("opora.audit")


async def audit_log(
    session: AsyncSession,
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    details: Optional[dict] = None,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    org_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    request_id: Optional[str] = None,
) -> None:
    """Добавляет запись в аудит-лог в рамках текущей сессии (без commit)."""
    try:
        # Если request_id не передан — берём из контекста middleware
        if request_id is None:
            try:
                request_id = request_id_var.get("") or None
            except Exception:
                pass

        log_entry = AuditLog(
            organization_id=org_id,
            user_id=user_id,
            user_email=user_email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
            request_id=request_id,
        )
        session.add(log_entry)
    except Exception as e:
        # Аудит-лог никогда не должен ломать основной flow
        logger.warning("Failed to write audit log: %s", e)


# ---------------------------------------------------------------------------
# Удобные обёртки для типовых действий
# ---------------------------------------------------------------------------

async def audit_login(
    session: AsyncSession,
    user_id: int,
    email: str,
    org_id: Optional[int],
    ip: Optional[str] = None,
) -> None:
    await audit_log(
        session,
        action="login",
        user_id=user_id,
        user_email=email,
        org_id=org_id,
        ip_address=ip,
    )


async def audit_create(
    session: AsyncSession,
    entity_type: str,
    entity_id: int,
    user_id: int,
    org_id: Optional[int],
    details: Optional[dict] = None,
) -> None:
    await audit_log(
        session,
        action="create",
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        org_id=org_id,
        details=details,
    )


async def audit_update(
    session: AsyncSession,
    entity_type: str,
    entity_id: int,
    user_id: int,
    org_id: Optional[int],
    before: Optional[dict] = None,
    after: Optional[dict] = None,
) -> None:
    await audit_log(
        session,
        action="update",
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        org_id=org_id,
        details={"before": before, "after": after},
    )


async def audit_delete(
    session: AsyncSession,
    entity_type: str,
    entity_id: int,
    user_id: int,
    org_id: Optional[int],
) -> None:
    await audit_log(
        session,
        action="delete",
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        org_id=org_id,
    )
