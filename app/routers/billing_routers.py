"""
Billing endpoints for organization plan management and payments.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from starlette import status

from app.models import Organization, Payment, User, Visit
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_admin_user, require_platform_admin

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

    # Count visits this month
    now = datetime.now(timezone.utc)
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
        # Placeholder URL -- real YuKassa integration will replace this
        payment_url = f"https://yukassa.example.com/pay?payment_id={payment.id}"

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
