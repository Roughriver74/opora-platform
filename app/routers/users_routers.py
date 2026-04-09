from typing import List

from fastapi import APIRouter, Depends, status
from pydantic import EmailStr

from app.models import User
from app.schemas.users_schema import CreateUser, UpdateUser
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_active_admin_user, get_current_user

router = APIRouter(prefix="/users")


@router.get("/me", response_model=dict)
async def get_current_user_info(
    uow: UnitOfWork = Depends(get_uow), current_user: User = Depends(get_current_user)
):
    """Получение информации о текущем пользователе"""
    return await uow.users.get_current_user_info(current_user=current_user)


@router.get("/search-bitrix", response_model=dict)
async def search_bitrix_user(
    email: EmailStr,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_active_admin_user),
):
    """Поиск пользователя в Bitrix24 по email"""
    return await uow.users.search_bitrix_user(email=email)


@router.get("", response_model=List[dict])
async def get_users(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_active_admin_user),
):
    """Получение списка всех пользователей"""
    return await uow.users.get_users(current_user=current_user)


@router.post("", response_model=dict)
async def create_user(
    user_data: CreateUser,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_active_admin_user),
):
    """Создание нового пользователя"""
    return await uow.users.create_user(user_data=user_data, current_user=current_user)


@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: int,
    user_data: UpdateUser,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_active_admin_user),
):
    """Обновление информации о пользователе"""
    return await uow.users.update_user(user_id=user_id, user_data=user_data, current_user=current_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_active_admin_user),
):
    """Удаление пользователя"""
    return await uow.users.delete_user(user_id=user_id, current_user=current_user)
