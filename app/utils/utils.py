from fastapi import Depends, HTTPException
from starlette import status

from app.models import User
from app.services.auth_service import oauth2_scheme
from app.services.uow import UnitOfWork, get_uow
from app.utils.logger import logger


@logger()
async def get_current_user(
    uow: UnitOfWork = Depends(get_uow), token: str = Depends(oauth2_scheme)
) -> User:
    return await uow.auth.get_current_user(token)
    # return await uow.auth.get_single_user_by_email("shikunov.e@w-stom.ru")


@logger()
async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.id == 1 or ("admin" in current_user.email)

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав доступа"
        )
    return current_user


@logger()
async def get_current_active_admin_user(
    uow: UnitOfWork = Depends(get_uow), token: str = Depends(oauth2_scheme)
) -> User:
    return await uow.auth.get_current_active_admin_user(token)
