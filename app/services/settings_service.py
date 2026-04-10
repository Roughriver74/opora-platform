from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.models import GlobalSettings, OrgSettings, User
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
    async def _get_org_setting(self, organization_id: int, key: str):
        """Получить настройку организации по ключу"""
        result = await self.session.execute(
            select(OrgSettings).where(
                and_(
                    OrgSettings.organization_id == organization_id,
                    OrgSettings.key == key,
                )
            )
        )
        return result.scalars().first()

    @logger()
    async def _get_org_settings(self, organization_id: int):
        """Получить все настройки организации"""
        result = await self.session.execute(
            select(OrgSettings).where(
                OrgSettings.organization_id == organization_id
            )
        )
        return result.scalars().all()

    @logger()
    async def get_all_settings(self, current_user):
        """Получить все настройки (глобальные + org-scoped)"""
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администраторы могут просматривать настройки",
            )

        # Platform admins see global settings
        if current_user.is_platform_admin:
            settings = (
                await self.session.execute(select(GlobalSettings))
            ).scalars().all()
            return settings

        # Org admins: merge global defaults with org overrides
        org_id = current_user.organization_id
        global_settings = (
            await self.session.execute(select(GlobalSettings))
        ).scalars().all()
        org_settings = await self._get_org_settings(org_id) if org_id else []

        org_map = {s.key: s for s in org_settings}
        merged = []
        for gs in global_settings:
            if gs.key in org_map:
                merged.append(org_map[gs.key])
            else:
                merged.append(gs)
        # Also include org-only settings not in global
        global_keys = {gs.key for gs in global_settings}
        for os in org_settings:
            if os.key not in global_keys:
                merged.append(os)

        return merged

    @logger()
    async def get_setting(self, key, check_to_create: bool = False, current_user=None):
        """Получить конкретную настройку по ключу (org-scoped, fallback to global)"""
        # Try org-scoped first
        if current_user and current_user.organization_id and not current_user.is_platform_admin:
            org_setting = await self._get_org_setting(
                current_user.organization_id, key
            )
            if org_setting:
                return org_setting

        # Fallback to global
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
        """Создать новую настройку (org-scoped для org_admin, global для platform_admin)"""
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администраторы могут создавать настройки",
            )

        if current_user.is_platform_admin:
            # Global setting
            existing_setting = await self.get_setting(
                key=setting.key, check_to_create=True
            )
            if existing_setting:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Настройка с ключом {setting.key} уже существует",
                )
            db_setting = GlobalSettings(**setting.model_dump())
        else:
            # Org-scoped setting
            org_id = current_user.organization_id
            existing = await self._get_org_setting(org_id, setting.key)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Настройка с ключом {setting.key} уже существует для вашей организации",
                )
            db_setting = OrgSettings(
                organization_id=org_id, **setting.model_dump()
            )

        self.session.add(db_setting)
        await self.session.commit()
        await self.session.refresh(db_setting)

        return db_setting

    @logger()
    async def update_setting(
        self, key: str, setting_update: GlobalSettingUpdate, current_user: User
    ):
        """Обновить настройку (org-scoped для org_admin, global для platform_admin)"""
        if not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только администраторы могут обновлять настройки",
            )

        if current_user.is_platform_admin:
            # Update global setting directly
            db_setting = await self.get_setting(key=key)
        else:
            # Org admin: update or create org override
            org_id = current_user.organization_id
            db_setting = await self._get_org_setting(org_id, key)
            if not db_setting:
                # Create an org override from the global default
                db_setting = OrgSettings(
                    organization_id=org_id,
                    key=key,
                    value=setting_update.value,
                    description=setting_update.description,
                )
                self.session.add(db_setting)
                await self.session.commit()
                await self.session.refresh(db_setting)
                return db_setting

        db_setting.value = setting_update.value
        if setting_update.description is not None:
            db_setting.description = setting_update.description

        await self.session.commit()
        await self.session.refresh(db_setting)
        return db_setting
