import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.models import Organization
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
    """Получить все настройки (глобальные + org-scoped)"""
    return await uow.settings.get_all_settings(current_user=current_user)


@router.post("/", response_model=GlobalSetting, status_code=status.HTTP_201_CREATED)
async def create_setting(
    setting: GlobalSettingCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Создать новую настройку"""
    return await uow.settings.create_setting(setting=setting, current_user=current_user)


# --- Static path segments MUST be registered before /{key} ---


@router.get("/value/{key}", response_model=str)
async def get_setting_value(key: str, uow: UnitOfWork = Depends(get_uow)):
    """Получить значение настройки по ключу (доступно без аутентификации)"""
    result = await uow.settings.get_setting(key=key)
    return result.value


@router.post("/generate-api-key")
async def generate_api_key(
    current_user=Depends(get_current_admin_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Generate or regenerate an API key for the current organization."""
    org_id = current_user.organization_id
    result = await uow.session.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    new_key = str(uuid.uuid4())
    org.api_key = new_key
    await uow.session.commit()
    await uow.session.refresh(org)

    return {"api_key": new_key}


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


# --- Dynamic path segment last ---


@router.get("/{key}", response_model=GlobalSetting)
async def get_setting(
    key: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Получить конкретную настройку по ключу"""
    return await uow.settings.get_setting(key=key, current_user=current_user)


@router.put("/{key}", response_model=GlobalSetting)
async def update_setting(
    key: str,
    setting_update: GlobalSettingUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Обновить существующую настройку"""
    return await uow.settings.update_setting(
        key=key, setting_update=setting_update, current_user=current_user
    )
