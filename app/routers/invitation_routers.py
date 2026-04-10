"""
Invitation endpoints for org admins to invite users to their organization.
"""
import logging
import secrets
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from starlette import status

from app.models import Invitation, Organization, User
from app.schemas.invitation_schema import CreateInvitation, InvitationResponse
from app.services.email_service import send_invitation_email
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter()

INVITATION_EXPIRY_DAYS = 7


@router.post("/", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    data: CreateInvitation,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Create an invitation for a new user to join the current organization.
    Only org_admin and platform_admin can create invitations.
    Checks plan limits for FREE plan before creating.
    """
    session = uow.session
    org_id = current_user.organization_id

    # Check plan limits
    org = (
        (await session.execute(select(Organization).where(Organization.id == org_id)))
        .scalars()
        .first()
    )
    if org and org.plan == "free":
        # Count existing users + pending invitations
        user_count = await session.scalar(
            select(func.count(User.id)).where(User.organization_id == org_id)
        )
        pending_invite_count = await session.scalar(
            select(func.count(Invitation.id)).where(
                Invitation.organization_id == org_id,
                Invitation.accepted_at.is_(None),
                Invitation.expires_at > datetime.utcnow(),
            )
        )
        max_users = (org.plan_limits or {}).get("max_users", 1)
        if (user_count + pending_invite_count) >= max_users:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Лимит пользователей для бесплатного плана ({max_users}) исчерпан. "
                       f"Текущих: {user_count}, ожидающих: {pending_invite_count}.",
            )

    # Check if user with this email already exists
    existing_user = (
        (await session.execute(select(User).where(User.email == data.email)))
        .scalars()
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже зарегистрирован",
        )

    # Check for existing pending invitation
    existing_invite = (
        (
            await session.execute(
                select(Invitation).where(
                    Invitation.email == data.email,
                    Invitation.organization_id == org_id,
                    Invitation.accepted_at.is_(None),
                    Invitation.expires_at > datetime.utcnow(),
                )
            )
        )
        .scalars()
        .first()
    )
    if existing_invite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Активное приглашение для этого email уже существует",
        )

    # Create invitation
    token = secrets.token_urlsafe(32)
    invitation = Invitation(
        organization_id=org_id,
        email=data.email,
        role=data.role,
        token=token,
        invited_by=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=INVITATION_EXPIRY_DAYS),
    )
    session.add(invitation)
    await session.commit()
    await session.refresh(invitation)

    # Try to send invitation email (non-blocking: don't fail the request on error)
    inviter_name = " ".join(
        part for part in [current_user.first_name, current_user.last_name] if part
    ) or current_user.email
    email_sent = await send_invitation_email(
        to_email=data.email,
        invite_token=invitation.token,
        org_name=org.name if org else "Организация",
        inviter_name=inviter_name,
    )
    if not email_sent:
        logger.warning(
            "Invitation created (id=%s) but email to %s was not sent",
            invitation.id,
            data.email,
        )

    return InvitationResponse(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        token=invitation.token,
        accepted_at=None,
        expires_at=invitation.expires_at.isoformat(),
        email_sent=email_sent,
    )


@router.get("/", response_model=List[InvitationResponse])
async def list_invitations(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """
    List pending invitations for the current organization.
    """
    session = uow.session
    org_id = current_user.organization_id

    invitations = (
        (
            await session.execute(
                select(Invitation)
                .where(
                    Invitation.organization_id == org_id,
                    Invitation.accepted_at.is_(None),
                )
                .order_by(Invitation.created_at.desc())
            )
        )
        .scalars()
        .all()
    )

    return [
        InvitationResponse(
            id=inv.id,
            email=inv.email,
            role=inv.role,
            token=inv.token,
            accepted_at=None,
            expires_at=inv.expires_at.isoformat(),
        )
        for inv in invitations
    ]


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Cancel (delete) a pending invitation.
    Only invitations belonging to the current org can be deleted.
    """
    session = uow.session

    invitation = (
        (
            await session.execute(
                select(Invitation).where(
                    Invitation.id == invitation_id,
                    Invitation.organization_id == current_user.organization_id,
                )
            )
        )
        .scalars()
        .first()
    )
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Приглашение не найдено",
        )

    await session.delete(invitation)
    await session.commit()
