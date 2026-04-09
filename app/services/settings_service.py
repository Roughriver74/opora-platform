from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.models import GlobalSettings, User
from app.schemas.settings_schema import GlobalSettingCreate, GlobalSettingUpdate
from app.utils.logger import logger


class SettingsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    @logger()
    async def initialize_settings(self):
        """Инициализирует настройки по умолчанию, если они не существуют"""
        default_settings = [
            {
                "key": "restrict_past_dates",
                "value": "true",
                "description": "Запрещает создание и редактирование визитов с датами ранее текущего дня",
            },
            {
                "key": "bitrix24_webhook_url",
                "value": "",
                "description": "Webhook URL для интеграции с Bitrix24. Формат: https://your-domain.bitrix24.ru/rest/user_id/webhook_key/",
            },
        ]

        try:
            for setting_data in default_settings:
                existing = (
                    (
                        await self.session.execute(
                            select(GlobalSettings).where(
                                GlobalSettings.key == setting_data["key"]
                            )
                        )
                    )
                    .scalars()
                    .first()
                )
                if not existing:
                    new_setting = GlobalSettings(**setting_data)
                    self.session.add(new_setting)
            await self.session.commit()
        except Exception:
            await self.session.rollback()

    @logger()
    async def get_all_settings(self, current_user):
        """Получить все глобальные настройки"""
        # Проверяем, является ли пользователь администратором
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администраторы могут просматривать глобальные настройки",
            )

        settings = (await self.session.execute(select(GlobalSettings))).scalars().all()
        return settings

    @logger()
    async def get_setting(self, key, check_to_create: bool = False):
        """Получить конкретную глобальную настройку по ключу"""
        setting = (
            (
                await self.session.execute(
                    select(GlobalSettings).where(GlobalSettings.key == key)
                )
            )
            .scalars()
            .first()
        )
        if check_to_create:
            return setting
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Настройка с ключом {key} не найдена",
            )
        return setting

    async def create_setting(self, setting: GlobalSettingCreate, current_user):
        """Создать новую глобальную настройку"""
        # Проверяем, является ли пользователь администратором
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администраторы могут создавать глобальные настройки",
            )

        # Проверяем, существует ли уже настройка с таким ключом
        existing_setting = await self.get_setting(key=setting.key, check_to_create=True)
        if existing_setting:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Настройка с ключом {setting.key} уже существует",
            )

        # Создаем новую настройку
        db_setting = GlobalSettings(**setting.model_dump())
        self.session.add(db_setting)
        await self.session.commit()
        await self.session.refresh(db_setting)

        return db_setting

    @logger()
    async def update_setting(
        self, key: str, setting_update: GlobalSettingUpdate, current_user: User
    ):
        """Обновить существующую глобальную настройку"""
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администраторы могут обновлять глобальные настройки",
            )

        db_setting = await self.get_setting(key=key)

        db_setting.value = setting_update.value
        if setting_update.description is not None:
            db_setting.description = setting_update.description

        await self.session.commit()
        await self.session.refresh(db_setting)
        return db_setting
