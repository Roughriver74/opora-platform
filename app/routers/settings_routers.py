from typing import List

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.schemas.settings_schema import (
    GlobalSetting,
    GlobalSettingCreate,
    GlobalSettingUpdate,
)
from app.services.bitrix24 import test_bitrix_webhook
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_admin_user, get_current_user

router = APIRouter()


class Bitrix24TestRequest(BaseModel):
    webhook_url: str


class Bitrix24TestResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None


@router.get("/", response_model=List[GlobalSetting])
async def get_all_settings(
    uow: UnitOfWork = Depends(get_uow), current_user=Depends(get_current_user)
):
    """Получить все глобальные настройки"""
    return await uow.settings.get_all_settings(current_user=current_user)


@router.get("/{key}", response_model=GlobalSetting)
async def get_setting(
    key: str, uow: UnitOfWork = Depends(get_uow), current_user=Depends(get_current_user)
):
    """Получить конкретную глобальную настройку по ключу"""
    return await uow.settings.get_setting(key=key)


@router.post("/", response_model=GlobalSetting, status_code=status.HTTP_201_CREATED)
async def create_setting(
    setting: GlobalSettingCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Создать новую глобальную настройку"""
    return await uow.settings.create_setting(setting=setting, current_user=current_user)


@router.put("/{key}", response_model=GlobalSetting)
async def update_setting(
    key: str,
    setting_update: GlobalSettingUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Обновить существующую глобальную настройку"""
    return await uow.settings.update_setting(
        key=key, setting_update=setting_update, current_user=current_user
    )


@router.get("/value/{key}", response_model=str)
async def get_setting_value(key: str, uow: UnitOfWork = Depends(get_uow)):
    """Получить значение глобальной настройки по ключу (доступно без аутентификации)"""
    result = await uow.settings.get_setting(key=key)
    return result.value


@router.post("/bitrix24/test", response_model=Bitrix24TestResponse)
async def test_bitrix24_connection(
    request: Bitrix24TestRequest,
    current_user=Depends(get_current_admin_user),
):
    """
    Тестирование подключения к Bitrix24 по указанному webhook URL.
    Требуется права администратора.
    Делает тестовый запрос user.get к API Bitrix24.
    """
    result = await test_bitrix_webhook(request.webhook_url)
    return Bitrix24TestResponse(**result)
