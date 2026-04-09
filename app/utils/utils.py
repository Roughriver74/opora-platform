from fastapi import Depends, Header, HTTPException
from starlette import status

from app.models import User
from app.services.auth_service import oauth2_scheme
from app.services.uow import UnitOfWork, get_uow
from app.utils.logger import logger
from app.utils.tenant import TenantContext


@logger()
async def get_current_user(
    uow: UnitOfWork = Depends(get_uow), token: str = Depends(oauth2_scheme)
) -> User:
    return await uow.auth.get_current_user(token)


@logger()
async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав доступа"
        )
    return current_user


@logger()
async def require_platform_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора платформы",
        )
    return current_user


@logger()
async def get_current_active_admin_user(
    uow: UnitOfWork = Depends(get_uow), token: str = Depends(oauth2_scheme)
) -> User:
    return await uow.auth.get_current_active_admin_user(token)


async def get_tenant(
    current_user: User = Depends(get_current_user),
    x_org_id: int | None = Header(None, alias="X-Org-Id"),
) -> TenantContext:
    """
    Build a TenantContext from the authenticated user.
    Platform admins may override the organization via the X-Org-Id header.
    """
    org_id = current_user.organization_id
    # Platform admin can impersonate any org
    if x_org_id is not None and current_user.is_platform_admin:
        org_id = x_org_id
    return TenantContext(
        organization_id=org_id,
        user_id=current_user.id,
        role=current_user.role,
    )
