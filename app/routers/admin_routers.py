from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.config import NETWORK_CLINIC_PROCESS_ID, VISIT_ENTITY_TYPE_ID
from app.models import FieldMapping, User
from app.schedulers.import_companies_from_excel import start_excel_parsing
from app.schemas.admin_schema import (
    FieldMappingBase,
    FieldMappingResponse,
    GlobalSettingCreate,
    GlobalSettingResponse,
)
from app.schemas.settings_schema import GlobalSettingBase
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_admin_user, get_current_user

router = APIRouter()


@router.get("/field-mappings", response_model=List[FieldMappingResponse])
async def get_field_mappings(
    entity_type: str = Query(default=None),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user),
):
    """Получение списка маппингов полей, с возможностью фильтрации по типу сущности"""
    return await uow.admin.get_field_mappings(entity_type, current_user=current_user)


@router.get("/public/field-mappings", response_model=List[FieldMappingResponse])
async def get_public_field_mappings(
    entity_type: str = Query(default=None),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user),
):
    """Публичное получение списка маппингов полей, с возможностью фильтрации по типу сущности"""
    return await uow.admin.get_field_mappings(entity_type, current_user=current_user)


@router.post(
    "/field-mappings",
    response_model=FieldMappingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_field_mapping(
    mapping: FieldMappingBase,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Создание нового маппинга поля"""
    return await uow.admin.create_field_mapping(mapping, current_user=current_user)


@router.put("/field-mappings/{mapping_id}", response_model=FieldMappingResponse)
async def update_field_mapping(
    mapping_id: int,
    mapping: FieldMappingBase,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Обновление существующего маппинга поля"""
    return await uow.admin.update_field_mapping(mapping_id, mapping, current_user=current_user)


@router.delete("/field-mappings/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field_mapping(
    mapping_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Удаление маппинга поля"""
    return await uow.admin.delete_field_mapping(mapping_id, current_user=current_user)


@router.post("/field-mappings/update-list-values", status_code=status.HTTP_200_OK)
async def update_field_list_values(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Обновление списочных значений для полей типа 'list' из Bitrix24"""
    return await uow.admin.update_field_mappings_with_list_values(FieldMapping, current_user=current_user)


@router.get("/bitrix/fields/visit")
async def get_visit_fields(
    entity_type_id: int = 1054,  # ID типа смарт-процесса для визитов
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Получение списка всех полей для визитов из Bitrix24"""
    return await uow.admin.get_smart_process_fields(VISIT_ENTITY_TYPE_ID)


@router.get("/bitrix/fields/company")
async def get_company_fields(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Получение списка всех полей для компаний (клиник) из Bitrix24"""
    return await uow.admin.get_company_fields()


# Маршруты для глобальных настроек
@router.get("/settings", response_model=List[GlobalSettingResponse])
async def get_global_settings(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Получение списка всех глобальных настроек"""
    return await uow.admin.get_global_settings()


@router.get("/settings/{key}", response_model=GlobalSettingResponse)
async def get_global_setting(
    key: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Получение глобальной настройки по ключу"""
    result = await uow.admin.get_global_settings(key=key)
    return result[0]  # Возвращаю первый найденный элемент, можно вернуть все


@router.post(
    "/settings",
    response_model=GlobalSettingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_global_setting(
    setting: GlobalSettingBase,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Создание новой глобальной настройки"""
    result = await uow.admin.create_global_setting(setting=setting)
    return result[0]


@router.put("/settings/{key}", response_model=GlobalSettingResponse)
async def update_global_setting(
    key: str,
    setting: GlobalSettingCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Обновление существующей глобальной настройки"""
    result = await uow.admin.update_global_setting(key=key, setting=setting)
    return result[0]


@router.delete("/settings/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_global_setting(
    key: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Удаление глобальной настройки"""
    return await uow.admin.delete_global_setting(key=key)


@router.get("/bitrix/fields/product")
async def get_product_fields(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Получение списка всех полей для продуктов из Bitrix24"""
    return await uow.admin.get_product_fields()


@router.get("/bitrix/fields/network-clinic")
async def get_network_clinic_fields(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Получение списка всех полей для продуктов из Bitrix24"""
    return await uow.admin.get_bitrix_fields_network_clinic(NETWORK_CLINIC_PROCESS_ID)


@router.get("/bitrix-fields/{entity_type}")
async def get_entity_bitrix_fields(
    entity_type: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Unified endpoint to get Bitrix24 fields for any entity type (used by FormBuilder UI)."""
    if entity_type == "visit":
        return await uow.admin.get_smart_process_fields(VISIT_ENTITY_TYPE_ID)
    elif entity_type in ("clinic", "company"):
        return await uow.admin.get_company_fields()
    elif entity_type in ("doctor", "contact", "network_clinic"):
        return await uow.admin.get_contact_fields()
    raise HTTPException(status_code=400, detail=f"Unknown entity_type: {entity_type}")


@router.get("/bitrix/field-values")
async def get_field_values(
    entity_type: str,
    field_id: str,
    entity_type_id: int = None,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_admin_user),
):
    """Получение списочных значений для поля из Bitrix24"""

    bitrix_entity_type = entity_type
    return await uow.admin.get_field_enum_values(
        bitrix_entity_type, field_id, entity_type_id
    )


@router.get("/test_excel_parsing")
async def test_excel_parsing():
    await start_excel_parsing()
