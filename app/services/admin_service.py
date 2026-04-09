from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.models import FieldMapping, GlobalSettings
from app.schemas.admin_schema import GlobalSettingResponse
from app.schemas.settings_schema import GlobalSettingBase
from app.services.bitrix24 import Bitrix24Client, require_bitrix24
from app.utils.logger import logger


class AdminQuery:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    def _require_bitrix(self) -> Bitrix24Client:
        """Guard: ensure Bitrix24 is configured before any Bitrix operation."""
        return require_bitrix24(self.bitrix24)

    @logger()
    async def get_field_mappings(self, entity_type, current_user=None):
        query = select(FieldMapping).where(FieldMapping.entity_type == entity_type)
        if current_user and not current_user.is_platform_admin:
            query = query.where(FieldMapping.organization_id == current_user.organization_id)
        result = await self.session.execute(query)
        return result.scalars().all()

    @logger()
    async def create_field_mapping(self, mapping, current_user=None):
        mapping_data = mapping.model_dump()
        if current_user:
            mapping_data["organization_id"] = current_user.organization_id
        db_mapping = FieldMapping(**mapping_data)
        self.session.add(db_mapping)
        await self.session.commit()
        await self.session.refresh(db_mapping)
        return db_mapping

    @logger()
    async def update_field_mapping(self, mapping_id, mapping, current_user=None):
        query = select(FieldMapping).where(FieldMapping.id == mapping_id)
        if current_user and not current_user.is_platform_admin:
            query = query.where(FieldMapping.organization_id == current_user.organization_id)
        db_mapping = (await self.session.execute(query)).scalars().first()
        if not db_mapping:
            raise HTTPException(status_code=404, detail="Mapping not found")

        for key, value in mapping.model_dump().items():
            setattr(db_mapping, key, value)

        await self.session.commit()
        await self.session.refresh(db_mapping)
        return db_mapping

    @logger()
    async def delete_field_mapping(self, mapping_id, current_user=None):
        query = delete(FieldMapping).where(FieldMapping.id == mapping_id)
        if current_user and not current_user.is_platform_admin:
            query = query.where(FieldMapping.organization_id == current_user.organization_id)
        await self.session.execute(query)
        await self.session.commit()
        return

    @logger()
    async def check_global_setting(self, key: str = None) -> Any:
        query = select(GlobalSettings)
        if key:
            query = query.where(GlobalSettings.key == key)
        return (await self.session.execute(query)).scalars().all()

    @staticmethod
    @logger()
    async def global_setting_list(settings):
        return [
            GlobalSettingResponse.model_validate(setting).model_dump()
            for setting in settings
        ]

    @logger()
    async def get_global_settings(self, key: str = None) -> List[dict]:
        """Получение всех глобальных настроек с преобразованием в словари."""
        settings = await self.check_global_setting(key)
        if not settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Настройка с ключом {key} не найдена",
            )
        return await self.global_setting_list(settings)

    @logger()
    async def create_global_setting(self, setting: GlobalSettingBase):
        existing_setting = await self.check_global_setting(setting.key)
        if existing_setting:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Настройка с ключом {setting.key} уже существует",
            )

        db_setting = GlobalSettings(**setting.model_dump())
        self.session.add(db_setting)
        await self.session.commit()
        await self.session.refresh(db_setting)

        return await self.global_setting_list([db_setting])

    @logger()
    async def update_global_setting(self, key: str, setting: GlobalSettingBase):
        db_setting = await self.check_global_setting(key)
        if not db_setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Настройка с ключом {key} не найдена",
            )

        db_setting[0].value = setting.value
        if setting.description is not None:  # TODO А точно ли нужна эта проверка ?
            db_setting[0].description = setting.description

        await self.session.commit()
        await self.session.refresh(db_setting[0])

        return await self.global_setting_list([db_setting[0]])

    @logger()
    async def delete_global_setting(self, key: str):
        await self.session.execute(
            delete(GlobalSettings).where(GlobalSettings.key == key)
        )
        await self.session.commit()
        return

    @logger()
    async def get_field_list_values(
        self, entity_type: str, field_id: str, entity_type_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Получение списка возможных значений для поля типа "список"
        """
        method = ""
        params = {}

        if entity_type == "company":
            method = "crm.company.fields"
        elif entity_type == "contact":
            method = "crm.contact.fields"
        elif entity_type == "item" and entity_type_id:
            method = "crm.item.fields"
            params["entityTypeId"] = entity_type_id
        else:
            return []

        self._require_bitrix()
        result = await self.bitrix24.make_request_async(method, params)

        if "error" in result:
            return []

        if (
            "result" in result
            and field_id in result["result"]
            and "items" in result["result"][field_id]
        ):
            return result["result"][field_id]["items"]
        return []

    @logger()
    async def fetch_list_fields(self, field_mappings_model, current_user=None):
        """Выборка полей с типом 'list'."""
        query = select(field_mappings_model).where(
            field_mappings_model.field_type == "list"
        )
        if current_user and not current_user.is_platform_admin:
            query = query.where(field_mappings_model.organization_id == current_user.organization_id)
        result = await self.session.execute(query)
        return result.scalars().all()

    @staticmethod
    @logger()
    async def determine_entity_type(field):
        """Определяет тип сущности на основе field.entity_type."""
        mapping = {"clinic": "company", "doctor": "contact"}
        return mapping.get(field.entity_type, "item")

    @logger()
    async def fetch_field_values(self, entity_type, field):
        """Получает значения полей для указанной сущности."""
        if entity_type == "item":
            if not field.entity_type_id:
                return None
            return await self.get_field_list_values(
                entity_type, field.bitrix_field_id, field.entity_type_id
            )
        return await self.get_field_list_values(entity_type, field.bitrix_field_id)

    @logger()
    async def update_field_mappings_with_list_values(
        self, field_mappings_model, current_user=None
    ) -> dict:
        """Обновление маппингов полей со списочными значениями из Bitrix24."""
        list_fields = await self.fetch_list_fields(field_mappings_model, current_user=current_user)

        updated_fields = []
        for field in list_fields:
            entity_type = await self.determine_entity_type(field)

            items = await self.fetch_field_values(entity_type, field)
            if not items:
                continue

            field.value_options = items
            field.updated_at = datetime.now()
            updated_fields.append(field.app_field_name)

        await self.session.commit()

        return {
            "detail": f"Списочные значения успешно обновлены для {len(updated_fields)} полей",
            "updated_fields": updated_fields,
        }

    @logger()
    async def get_smart_process_fields(self, entity_type_id: int) -> Dict:
        """
        Получение списка полей смарт-процесса из Bitrix24

        Args:
            entity_type_id: ID типа смарт-процесса

        Returns:
            Список полей смарт-процесса
        """
        self._require_bitrix()
        params = {"entityTypeId": entity_type_id}
        result = await self.bitrix24.make_request_async("crm.item.fields", params)
        return result.get("result", {}) if result else {}

    @logger()
    async def get_bitrix_fields_network_clinic(self, entity_type_id: int) -> List:
        result = await self.get_smart_process_fields(entity_type_id)
        result_list = []
        for item, value in result.get("fields").items():
            value["upperName"] = item
            result_list.append(value)
        return result_list

    @logger()
    async def get_company_fields(self) -> Dict:
        """
        Получение списка полей для компаний из Bitrix24

        Returns:
            Список полей компаний
        """
        self._require_bitrix()
        result = await self.bitrix24.make_request_async("crm.company.fields")
        return result.get("result", {}) if result else {}

    @logger()
    async def get_contact_fields(self) -> Dict:
        """
        Получение списка полей для контактов из Bitrix24

        Returns:
            Список полей контактов
        """
        self._require_bitrix()
        result = await self.bitrix24.make_request_async("crm.contact.fields")
        return result.get("result", {}) if result else {}

    @logger()
    async def get_product_fields(self) -> Dict:
        """Получение списка полей для продуктов из Bitrix24"""
        self._require_bitrix()
        result = await self.bitrix24.make_request_async("crm.product.fields")
        return result.get("result", {}) if result else {}

    @logger()
    async def fetch_fields(
        self, entity_type: str, entity_type_id: Optional[int] = None
    ):
        """Получение полей для указанного типа сущности."""
        if entity_type == "visit":
            entity_type_id = entity_type_id or 1054
            return await self.get_smart_process_fields(entity_type_id)
        elif entity_type == "company":
            return await self.get_company_fields()
        elif entity_type == "contact":
            return await self.get_contact_fields()
        elif entity_type == "product":
            return await self.get_product_fields()
        return {}

    @staticmethod
    @logger()
    async def extract_field_values(fields: dict, field_id: str) -> dict:
        """Извлечение списочных значений для указанного поля."""
        if field_id in fields:
            field_info = fields[field_id]
            if (
                field_info.get("type") in ["enumeration", "crm_status"]
                and "items" in field_info
            ):
                return {"items": field_info["items"]}
        return {"items": []}

    @logger()
    async def get_field_enum_values(
        self, entity_type: str, field_id: str, entity_type_id: Optional[int] = None
    ) -> Dict:
        """Получение списочных значений для поля."""
        fields_data = await self.fetch_fields(entity_type, entity_type_id)

        if entity_type == "visit":
            fields = fields_data.get("fields", {})
        else:
            fields = fields_data

        return await self.extract_field_values(fields, field_id)
