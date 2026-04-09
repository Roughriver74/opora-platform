from typing import Optional

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.models import User
from app.schemas.users_schema import UserCreate, UserUpdate
from app.services.bitrix24 import Bitrix24Client, require_bitrix24
from app.utils.logger import logger


class UsersService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    @staticmethod
    @logger()
    async def get_current_user_info(current_user: User):
        """Получение информации о текущем пользователе"""
        return {
            "id": current_user.id,
            "email": current_user.email,
            "is_active": current_user.is_active,
            "is_admin": current_user.is_admin,
            "created_at": current_user.created_at,
            "updated_at": current_user.updated_at,
            "bitrix_user_id": current_user.bitrix_user_id,
            "regions": current_user.regions or [],
        }

    @logger()
    async def search_bitrix_user(self, email):
        """Поиск пользователя в Bitrix24 по email"""
        bitrix = require_bitrix24(self.bitrix24)
        user = await bitrix.get_user_by_email(email)

        if user:
            return {
                "found": True,
                "user": {
                    "id": user.get("ID"),
                    "email": user.get("EMAIL"),
                    "name": user.get("NAME"),
                    "last_name": user.get("LAST_NAME"),
                },
            }
        else:
            return {"found": False}

    @logger()
    async def get_users(self):
        """Получение списка всех пользователей"""
        users = (await self.session.execute(select(User))).scalars().all()
        return [
            {
                "id": user.id,
                "email": user.email,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
                "created_at": user.created_at,
                "updated_at": user.updated_at,
                "bitrix_user_id": user.bitrix_user_id,
                "regions": user.regions or [],
            }
            for user in users
        ]

    @logger()
    async def create_user(
        self,
        user_data: UserCreate,
    ):
        """Создание нового пользователя"""
        existing_user = (
            (
                await self.session.execute(
                    select(User).where(
                        or_(
                            User.email == user_data.email,
                            User.bitrix_user_id == user_data.bitrix_user_id,
                        )
                    )
                )
            )
            .scalars()
            .first()
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким Bitrix ID уже существует",
            )

        user = User(
            email=user_data.email,
            is_active=user_data.is_active,
            is_admin=user_data.is_admin,
            bitrix_user_id=user_data.bitrix_user_id,
            regions=user_data.regions,
        )
        user.set_password(user_data.password)

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "bitrix_user_id": user.bitrix_user_id,
            "regions": user.regions or [],
        }

    @logger()
    async def update_user(self, user_id: int, user_data: UserUpdate) -> dict:
        """
        Обновление информации о пользователе.
        """
        user = await self._get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )

        await self._validate_unique_fields(user_id, user_data)

        await self._update_user_fields(user, user_data)

        await self.session.commit()
        await self.session.refresh(user)

        return await self._format_user_response(user)

    @logger()
    async def _get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Получает пользователя из базы данных по его ID.
        """
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    @logger()
    async def _validate_unique_fields(self, user_id: int, user_data: UserUpdate):
        """
        Проверяет уникальность email и Bitrix ID.
        """
        if user_data.email:
            existing_user = (
                (
                    await self.session.execute(
                        select(User).where(
                            User.email == user_data.email, User.id != user_id
                        )
                    )
                )
                .scalars()
                .first()
            )
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с таким email уже существует",
                )

        if user_data.bitrix_user_id:
            existing_user = (
                (
                    await self.session.execute(
                        select(User).where(
                            User.bitrix_user_id == user_data.bitrix_user_id,
                            User.id != user_id,
                        )
                    )
                )
                .scalars()
                .first()
            )
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с таким Bitrix ID уже существует",
                )

    @staticmethod
    @logger()
    async def _update_user_fields(user: User, user_data: UserUpdate):
        """
        Обновляет поля пользователя на основе предоставленных данных.
        """
        if user_data.email:
            user.email = user_data.email

        if user_data.bitrix_user_id:
            user.bitrix_user_id = user_data.bitrix_user_id

        if user_data.password:
            user.set_password(user_data.password)

        if user_data.is_active is not None:
            user.is_active = user_data.is_active

        if user_data.is_admin is not None:
            user.is_admin = user_data.is_admin

        if user_data.regions is not None:
            user.regions = user_data.regions

    @staticmethod
    @logger()
    async def _format_user_response(user: User) -> dict:
        """
        Форматирует ответ для пользователя.
        """
        return {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "bitrix_user_id": user.bitrix_user_id,
            "regions": user.regions or [],
        }

    @logger()
    async def delete_user(
        self,
        user_id: int,
    ):
        """Удаление пользователя"""
        user = await self._get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден"
            )

        await self.session.delete(user)
        await self.session.commit()
