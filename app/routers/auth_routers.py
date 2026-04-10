import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.config import Settings as settings
from app.models import Invitation, Organization, User
from app.schemas.auth_schema import AcceptInvite, OrgRegister, Token, UserCreate, UserResponse
from app.services.uow import UnitOfWork, get_uow

router = APIRouter()


@router.post("/token", response_model=Token)
@router.post("/login", response_model=dict)
async def login_for_access_token(
    request: Request,
    data: Optional[Dict[str, Any]] = Body(None),
    form_data: OAuth2PasswordRequestForm = Depends(None),
    uow: UnitOfWork = Depends(get_uow),
) -> Any:
    # Если данные приходят в формате JSON (от фронтенда)
    if data and "email" in data and "password" in data:
        username = data["email"]
        password = data["password"]
    # Если данные приходят в формате формы (от Swagger UI)
    elif form_data:
        username = form_data.username
        password = form_data.password
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request format"
        )
    user = await uow.auth.authenticate_user(username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = await uow.auth.create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role,
            "organization_id": user.organization_id,
        },
        expires_delta=access_token_expires,
    )
    # Если это запрос на /login, возвращаем также информацию о пользователе
    if request.url.path.endswith("/login"):
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "organization_id": user.organization_id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "regions": user.regions or [],
            },
        }
    # Если это запрос на /token, возвращаем только токен
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, uow: UnitOfWork = Depends(get_uow)) -> Any:
    """
    Register a new user.
    The email must match a Bitrix24 user's email.
    """
    try:
        user = await uow.auth.register_user(user_in.email, user_in.password)
        return {"email": user.email, "bitrix_user_id": user.bitrix_user_id}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/register-org", response_model=dict)
async def register_org(data: OrgRegister, uow: UnitOfWork = Depends(get_uow)) -> Any:
    """
    Self-registration: create a new Organization + org_admin User in one transaction.
    Returns a JWT token so the user is immediately logged in.
    Public endpoint -- no auth required.
    """
    session = uow.session

    # Check if email already registered
    existing = (
        (await session.execute(select(User).where(User.email == data.email)))
        .scalars()
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже зарегистрирован",
        )

    # Generate slug from company name
    slug = data.company_name.lower().replace(" ", "-")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    # Ensure unique
    existing_slug = (
        (await session.execute(select(Organization).where(Organization.slug == slug)))
        .scalars()
        .first()
    )
    if existing_slug:
        slug = f"{slug}-{secrets.token_hex(3)}"

    # 1. Create Organization
    org = Organization(
        name=data.company_name,
        slug=slug,
        plan="free",
        plan_limits={"max_users": 1, "max_visits_per_month": 100},
        is_active=True,
    )
    session.add(org)
    await session.flush()  # get org.id

    # 2. Create User as org_admin
    user = User(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        role="org_admin",
        organization_id=org.id,
        is_active=True,
    )
    user.set_password(data.password)
    session.add(user)
    await session.flush()  # get user.id

    # 3. Set org owner
    org.owner_id = user.id

    await session.commit()
    await session.refresh(user)
    await session.refresh(org)

    # 4. Create JWT token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = await uow.auth.create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role,
            "organization_id": user.organization_id,
        },
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "organization_id": user.organization_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "regions": user.regions or [],
        },
        "organization": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "plan": org.plan,
        },
    }


@router.post("/accept-invite", response_model=dict)
async def accept_invite(data: AcceptInvite, uow: UnitOfWork = Depends(get_uow)) -> Any:
    """
    Accept an invitation token. Creates a new User in the invited organization.
    Public endpoint -- no auth required.
    """
    session = uow.session

    # Find invitation by token
    invitation = (
        (
            await session.execute(
                select(Invitation).where(
                    Invitation.token == data.token,
                    Invitation.accepted_at.is_(None),
                )
            )
        )
        .scalars()
        .first()
    )
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Приглашение не найдено или уже использовано",
        )

    # Check expiry
    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Срок действия приглашения истёк",
        )

    # Check if email already exists
    existing = (
        (await session.execute(select(User).where(User.email == invitation.email)))
        .scalars()
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email уже зарегистрирован",
        )

    # Plan limits: check user count
    org = (
        (
            await session.execute(
                select(Organization).where(Organization.id == invitation.organization_id)
            )
        )
        .scalars()
        .first()
    )
    if org and org.plan == "free":
        from sqlalchemy import func

        user_count = await session.scalar(
            select(func.count(User.id)).where(
                User.organization_id == invitation.organization_id
            )
        )
        max_users = (org.plan_limits or {}).get("max_users", 1)
        if user_count >= max_users:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Лимит пользователей для бесплатного плана ({max_users}) исчерпан",
            )

    # Create user
    user = User(
        email=invitation.email,
        first_name=data.first_name,
        last_name=data.last_name,
        role=invitation.role,
        organization_id=invitation.organization_id,
        invited_by=invitation.invited_by,
        is_active=True,
    )
    user.set_password(data.password)
    session.add(user)

    # Mark invitation as accepted
    invitation.accepted_at = datetime.utcnow()

    await session.commit()
    await session.refresh(user)

    # Create JWT token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = await uow.auth.create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role,
            "organization_id": user.organization_id,
        },
        expires_delta=access_token_expires,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "organization_id": user.organization_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "regions": user.regions or [],
        },
    }
