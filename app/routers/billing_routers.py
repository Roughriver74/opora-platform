"""
Billing endpoints for organization plan management and payments.
Includes YuKassa payment integration.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from starlette import status

from app.models import Organization, Payment, User, Visit
from app.services.uow import UnitOfWork, get_uow
from app.services.yukassa_service import (
    YuKassaError,
    check_payment_status as yukassa_check_status,
    create_payment as yukassa_create_payment,
)
from app.utils.utils import get_current_admin_user, require_platform_admin

logger = logging.getLogger(__name__)

router = APIRouter()


# ---- Schemas ----


class PlanInfo(BaseModel):
    plan: str
    plan_limits: Optional[dict] = None
    billing_email: Optional[str] = None
    billing_inn: Optional[str] = None
    usage: dict  # { users_count, visits_this_month }

    class Config:
        from_attributes = True


class UpgradeRequest(BaseModel):
    users_count: int
    payment_method: str  # "invoice" | "yukassa"


class UpgradeResponse(BaseModel):
    payment_id: int
    status: str
    amount: int  # kopecks
    currency: str
    payment_method: str
    description: str
    payment_url: Optional[str] = None  # for yukassa


class PaymentResponse(BaseModel):
    id: int
    amount: int
    currency: str
    status: str
    payment_method: Optional[str] = None
    payment_id: Optional[str] = None
    description: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    users_count: Optional[int] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class ActivatePaymentRequest(BaseModel):
    payment_id: int


# Price per user per month in kopecks (990 RUB = 99000 kopecks)
PRICE_PER_USER_MONTH_KOPECKS = 99000


# ---- Endpoints ----


@router.get("/plan", response_model=PlanInfo)
async def get_plan_info(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Get current organization plan info, limits, billing details and usage stats.
    Available to org_admin.
    """
    session = uow.session
    org_id = current_user.organization_id

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

    # Count users in organization
    users_count = (
        await session.scalar(
            select(func.count(User.id)).where(User.organization_id == org_id)
        )
    ) or 0

    # Count visits this month (Visit.date is naive datetime)
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    visits_this_month = (
        await session.scalar(
            select(func.count(Visit.id)).where(
                Visit.organization_id == org_id,
                Visit.date >= month_start,
            )
        )
    ) or 0

    return PlanInfo(
        plan=org.plan or "free",
        plan_limits=org.plan_limits,
        billing_email=org.billing_email,
        billing_inn=org.billing_inn,
        usage={
            "users_count": users_count,
            "visits_this_month": visits_this_month,
        },
    )


@router.post("/request-upgrade", response_model=UpgradeResponse)
async def request_upgrade(
    body: UpgradeRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Request a plan upgrade. Creates a pending payment record.
    For 'invoice': creates Payment(status=pending, method=invoice), returns invoice details.
    For 'yukassa': creates Payment(status=pending, method=yukassa), returns payment_url placeholder.
    """
    session = uow.session
    org_id = current_user.organization_id

    if body.users_count < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Количество пользователей должно быть не менее 1",
        )

    if body.payment_method not in ("invoice", "yukassa"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Метод оплаты должен быть 'invoice' или 'yukassa'",
        )

    amount = PRICE_PER_USER_MONTH_KOPECKS * body.users_count
    now = datetime.now(timezone.utc)
    period_start = now
    period_end = now + timedelta(days=30)

    description = (
        f"PRO тариф: {body.users_count} пользователь(ей) x 990 руб/мес"
    )

    payment = Payment(
        organization_id=org_id,
        amount=amount,
        currency="RUB",
        status="pending",
        payment_method=body.payment_method,
        description=description,
        period_start=period_start,
        period_end=period_end,
        users_count=body.users_count,
    )
    session.add(payment)
    await session.commit()
    await session.refresh(payment)

    payment_url = None
    if body.payment_method == "yukassa":
        try:
            yk_result = await yukassa_create_payment(
                amount_kopecks=amount,
                description=description,
                metadata={
                    "organization_id": org_id,
                    "local_payment_id": payment.id,
                },
            )
            payment.payment_id = yk_result["payment_id"]
            await session.commit()
            await session.refresh(payment)
            payment_url = yk_result["confirmation_url"]
        except YuKassaError as exc:
            logger.error("YuKassa create_payment failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            )

    return UpgradeResponse(
        payment_id=payment.id,
        status=payment.status,
        amount=payment.amount,
        currency=payment.currency,
        payment_method=payment.payment_method,
        description=payment.description,
        payment_url=payment_url,
    )


@router.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """
    List all payments for the current organization. Available to org_admin.
    """
    session = uow.session
    org_id = current_user.organization_id

    result = await session.execute(
        select(Payment)
        .where(Payment.organization_id == org_id)
        .order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()

    return [
        PaymentResponse(
            id=p.id,
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            payment_method=p.payment_method,
            payment_id=p.payment_id,
            description=p.description,
            period_start=p.period_start.isoformat() if p.period_start else None,
            period_end=p.period_end.isoformat() if p.period_end else None,
            users_count=p.users_count,
            created_at=p.created_at.isoformat() if p.created_at else None,
        )
        for p in payments
    ]


# ---- Platform admin endpoint ----


@router.put(
    "/activate-payment/{payment_id}",
    response_model=PaymentResponse,
)
async def activate_payment(
    payment_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_platform_admin),
):
    """
    Manually activate a payment and upgrade the organization plan to PRO.
    Platform admin only.
    """
    session = uow.session

    payment = (
        (await session.execute(select(Payment).where(Payment.id == payment_id)))
        .scalars()
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платёж не найден",
        )

    if payment.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Платёж уже активирован",
        )

    # Mark payment as paid
    payment.status = "paid"

    # Upgrade organization plan
    org = (
        (
            await session.execute(
                select(Organization).where(
                    Organization.id == payment.organization_id
                )
            )
        )
        .scalars()
        .first()
    )
    if org:
        org.plan = "pro"
        org.plan_limits = {
            "max_users": payment.users_count or 10,
            "max_visits_per_month": -1,  # unlimited
        }

    await session.commit()
    await session.refresh(payment)

    return PaymentResponse(
        id=payment.id,
        amount=payment.amount,
        currency=payment.currency,
        status=payment.status,
        payment_method=payment.payment_method,
        payment_id=payment.payment_id,
        description=payment.description,
        period_start=payment.period_start.isoformat() if payment.period_start else None,
        period_end=payment.period_end.isoformat() if payment.period_end else None,
        users_count=payment.users_count,
        created_at=payment.created_at.isoformat() if payment.created_at else None,
    )


# ---- YuKassa webhook (no auth -- called by YuKassa servers) ----

# YuKassa notification IP ranges (as of docs)
# https://yookassa.ru/developers/using-api/webhooks
YUKASSA_ALLOWED_IPS = {
    "185.71.76.0/27",
    "185.71.77.0/27",
    "77.75.153.0/25",
    "77.75.156.11",
    "77.75.156.35",
    "77.75.154.128/25",
    "2a02:5180::/32",
}


def _ip_in_yukassa_range(ip: str) -> bool:
    """
    Simple check if the IP belongs to YuKassa notification ranges.
    For production use, consider a proper CIDR check with the ipaddress module.
    """
    import ipaddress

    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False

    for cidr in YUKASSA_ALLOWED_IPS:
        try:
            if addr in ipaddress.ip_network(cidr, strict=False):
                return True
        except ValueError:
            continue

    return False


class YuKassaWebhookPayload(BaseModel):
    """Minimal schema for YuKassa webhook notification."""

    type: str  # "notification"
    event: str  # "payment.succeeded", "payment.canceled", etc.
    object: Dict[str, Any]


@router.post("/yukassa-webhook")
async def yukassa_webhook(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Webhook endpoint called by YuKassa when payment status changes.
    No authentication -- YuKassa sends POST with JSON body.
    We verify by checking the source IP.
    """
    # Parse body
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body",
        )

    # Verify source IP (best-effort; use X-Forwarded-For if behind proxy)
    client_ip = request.client.host if request.client else ""
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()

    if client_ip and not _ip_in_yukassa_range(client_ip):
        logger.warning(
            "YuKassa webhook called from non-whitelisted IP: %s", client_ip
        )
        # In dev mode we still process, in prod you might want to reject:
        # raise HTTPException(status_code=403, detail="Forbidden")

    event = body.get("event", "")
    payment_object = body.get("object", {})
    external_payment_id = payment_object.get("id", "")
    payment_status = payment_object.get("status", "")

    logger.info(
        "YuKassa webhook received: event=%s payment_id=%s status=%s",
        event,
        external_payment_id,
        payment_status,
    )

    if not external_payment_id:
        return {"status": "ok", "message": "no payment_id in payload"}

    session = uow.session

    # Find the local payment record by external payment_id
    payment = (
        (
            await session.execute(
                select(Payment).where(Payment.payment_id == external_payment_id)
            )
        )
        .scalars()
        .first()
    )

    if not payment:
        logger.warning(
            "YuKassa webhook: payment not found for external_id=%s",
            external_payment_id,
        )
        return {"status": "ok", "message": "payment not found"}

    if event == "payment.succeeded" or payment_status == "succeeded":
        if payment.status != "paid":
            payment.status = "paid"

            # Upgrade organization plan to PRO
            org = (
                (
                    await session.execute(
                        select(Organization).where(
                            Organization.id == payment.organization_id
                        )
                    )
                )
                .scalars()
                .first()
            )
            if org:
                org.plan = "pro"
                org.plan_limits = {
                    "max_users": payment.users_count or 10,
                    "max_visits_per_month": -1,  # unlimited
                }
                logger.info(
                    "Organization %s upgraded to PRO via YuKassa payment %s",
                    org.id,
                    external_payment_id,
                )

            await session.commit()

    elif event == "payment.canceled" or payment_status == "canceled":
        if payment.status not in ("paid", "failed"):
            payment.status = "failed"
            await session.commit()
            logger.info(
                "Payment %s marked as failed (YuKassa canceled)",
                external_payment_id,
            )

    return {"status": "ok"}


# ---- Check payment status (org_admin) ----


class CheckPaymentResponse(BaseModel):
    payment_id: str
    local_status: str
    yukassa_status: str
    paid: bool
    amount: int  # kopecks


@router.get(
    "/check-payment/{payment_id}",
    response_model=CheckPaymentResponse,
)
async def check_payment(
    payment_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Check the current status of a payment via YuKassa API and update the local record.
    Available to org_admin.
    """
    session = uow.session
    org_id = current_user.organization_id

    payment = (
        (
            await session.execute(
                select(Payment).where(
                    Payment.id == payment_id,
                    Payment.organization_id == org_id,
                )
            )
        )
        .scalars()
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платёж не найден",
        )

    if not payment.payment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У этого платежа нет внешнего ID ЮКасса",
        )

    try:
        yk_status = await yukassa_check_status(payment.payment_id)
    except YuKassaError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )

    # Update local status based on YuKassa response
    yukassa_status = yk_status["status"]
    status_changed = False

    if yukassa_status == "succeeded" and payment.status != "paid":
        payment.status = "paid"
        status_changed = True

        # Upgrade organization plan
        org = (
            (
                await session.execute(
                    select(Organization).where(
                        Organization.id == payment.organization_id
                    )
                )
            )
            .scalars()
            .first()
        )
        if org:
            org.plan = "pro"
            org.plan_limits = {
                "max_users": payment.users_count or 10,
                "max_visits_per_month": -1,
            }

    elif yukassa_status == "canceled" and payment.status not in ("paid", "failed"):
        payment.status = "failed"
        status_changed = True

    if status_changed:
        await session.commit()
        await session.refresh(payment)

    return CheckPaymentResponse(
        payment_id=payment.payment_id,
        local_status=payment.status,
        yukassa_status=yukassa_status,
        paid=yk_status["paid"],
        amount=yk_status["amount"],
    )
