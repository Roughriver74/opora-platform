from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.models import Organization, User
from app.schemas.users_schema import CreateUser, UpdateUser
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
            "role": current_user.role,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "organization_id": current_user.organization_id,
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
    async def get_users(self, current_user=None):
        """Получение списка пользователей (scoped to organization)"""
        query = select(User)
        if current_user and not current_user.is_platform_admin:
            query = query.where(User.organization_id == current_user.organization_id)
        users = (await self.session.execute(query)).scalars().all()
        return [
            {
                "id": user.id,
                "email": user.email,
                "is_active": user.is_active,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "organization_id": user.organization_id,
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
        user_data: CreateUser,
        current_user=None,
    ):
        """Создание нового пользователя (scoped to organization)"""
        existing_user = (
            (
                await self.session.execute(
                    select(User).where(User.email == user_data.email)
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

        # Plan limits enforcement: check user count for FREE plan
        if current_user:
            org = await self._get_organization(current_user.organization_id)
            if org and org.plan == "free":
                user_count = await self.session.scalar(
                    select(func.count(User.id)).where(
                        User.organization_id == current_user.organization_id
                    )
                )
                max_users = (org.plan_limits or {}).get("max_users", 3)
                if user_count >= max_users:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Лимит пользователей для бесплатного плана ({max_users}) исчерпан. Обновите план.",
                    )

        user = User(
            email=user_data.email,
            role=user_data.role,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            regions=user_data.regions,
            organization_id=current_user.organization_id if current_user else None,
        )
        user.set_password(user_data.password)

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "organization_id": user.organization_id,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "bitrix_user_id": user.bitrix_user_id,
            "regions": user.regions or [],
        }

    @logger()
    async def update_user(self, user_id: int, user_data: UpdateUser, current_user=None) -> dict:
        """
        Обновление информации о пользователе (scoped to organization).
        """
        user = await self._get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )
        # Ensure user belongs to same org (unless platform_admin)
        if current_user and not current_user.is_platform_admin:
            if user.organization_id != current_user.organization_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Нельзя редактировать пользователя другой организации",
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
    async def _validate_unique_fields(self, user_id: int, user_data: UpdateUser):
        """
        Проверяет уникальность email.
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

    @staticmethod
    @logger()
    async def _update_user_fields(user: User, user_data: UpdateUser):
        """
        Обновляет поля пользователя на основе предоставленных данных.
        """
        if user_data.email:
            user.email = user_data.email

        if user_data.password:
            user.set_password(user_data.password)

        if user_data.is_active is not None:
            user.is_active = user_data.is_active

        if user_data.role is not None:
            user.role = user_data.role

        if user_data.first_name is not None:
            user.first_name = user_data.first_name

        if user_data.last_name is not None:
            user.last_name = user_data.last_name

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
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "organization_id": user.organization_id,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "bitrix_user_id": user.bitrix_user_id,
            "regions": user.regions or [],
        }

    @logger()
    async def _get_organization(self, org_id: int) -> Optional[Organization]:
        """Получает организацию по ID."""
        result = await self.session.execute(
            select(Organization).where(Organization.id == org_id)
        )
        return result.scalars().first()

    @logger()
    async def delete_user(
        self,
        user_id: int,
        current_user=None,
    ):
        """Удаление пользователя (scoped to organization)"""
        user = await self._get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден"
            )
        # Ensure user belongs to same org (unless platform_admin)
        if current_user and not current_user.is_platform_admin:
            if user.organization_id != current_user.organization_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Нельзя удалить пользователя другой организации",
                )

        await self.session.delete(user)
        await self.session.commit()
