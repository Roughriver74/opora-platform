from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.models import CustomSection
from app.schemas.custom_section_schema import CustomSection as CustomSectionSchema
from app.schemas.custom_section_schema import CustomSectionCreate as CustomSectionCreate
from app.schemas.custom_section_schema import CustomSectionList
from app.services.uow import UnitOfWork, get_uow

router = APIRouter()


# Получение всех секций (глобально)
@router.get("/custom-sections", response_model=CustomSectionList)
async def get_all_custom_sections(
    uow: UnitOfWork = Depends(get_uow),
):
    """
    Get all custom sections (globally available for all companies)
    """
    return await uow.custom_section.get_all_custom_sections()


# Создание новой секции
@router.post("/custom-sections", response_model=CustomSectionSchema)
async def create_custom_section(
    section: CustomSectionCreate, uow: UnitOfWork = Depends(get_uow), current_user=None
):
    """
    Create a new custom section
    """
    return await uow.custom_section.create_custom_section(section=section)


# Обновление всех секций
@router.put("/custom-sections", response_model=CustomSectionList)
async def update_all_custom_sections(
    sections: List[CustomSectionCreate],
    uow: UnitOfWork = Depends(get_uow),
    current_user=None,
):
    """
    Update all custom sections (replaces existing ones)
    """
    return await uow.custom_section.update_all_custom_sections(
        sections=sections, current_user=current_user
    )


# Удаление всех секций (очистка)
@router.delete("/custom-sections", response_model=dict)
async def delete_all_custom_sections(
    uow: UnitOfWork = Depends(get_uow), current_user=None
):
    """
    Delete all custom sections
    """
    return await uow.custom_section.delete_all_custom_sections()


# Для обратной совместимости оставим старый маршрут, но он будет просто проксировать к глобальным секциям
@router.get("/companies/{company_id}/custom-sections", response_model=CustomSectionList)
async def get_company_sections(company_id: int, uow: UnitOfWork = Depends(get_uow)):
    """
    Get custom sections for a company (backward compatibility)
    Now returns all global sections regardless of company_id
    """
    return await uow.custom_section.get_company_sections()


@router.put("/companies/{company_id}/custom-sections", response_model=CustomSectionList)
async def update_all_company_sections(
    company_id: int,
    sections: List[CustomSectionCreate],
    uow: UnitOfWork = Depends(get_uow),
    current_user=None,
):
    """
    Update all custom sections for a company (backward compatibility)
    Now updates global sections regardless of company_id
    """
    return await uow.custom_section.update_all_company_sections(sections=sections)
