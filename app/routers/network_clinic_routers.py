from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from starlette import status

from app.schemas.network_clinic_schema import (
    CreateNetworkClinicSchema,
    PaginatedResponse,
    ResponseNetworkClinicSchema,
    ResponseNetworkClinicWithClinicBitrixIdSchema,
)
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter()


@router.get(
    "/",
    description="Получение списка филиалов.",
    response_model=List[ResponseNetworkClinicSchema],
    status_code=status.HTTP_200_OK,
)
async def get_network_clinics(
    uow: UnitOfWork = Depends(get_uow), current_user=Depends(get_current_user)
):
    return await uow.network_clinic.get_network_clinics(current_user=current_user)


@router.post(
    "/",
    description="Создание нового филиала.",
    response_model=ResponseNetworkClinicSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_network_clinic(
    data: CreateNetworkClinicSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.network_clinic.create_network_clinic(
        data=data, current_user=current_user
    )


@router.get(
    "/{bitrix_network_clinic_id}",
    description="Получение информации о филиале.",
    response_model=ResponseNetworkClinicWithClinicBitrixIdSchema,
    status_code=status.HTTP_200_OK,
)
async def get_network_clinic(
    bitrix_network_clinic_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    result = await uow.network_clinic.get_network_clinic(
        bitrix_id=bitrix_network_clinic_id
    )
    clinic_bitrix_data = await uow.network_clinic.get_clinic_bitrix_id(
        result.company_id
    )

    return {**result.__dict__, "bitrixMainClinicID": clinic_bitrix_data.bitrix_id}


@router.post(
    "/update_clinic",
    description="Обновление филиала.",
    status_code=status.HTTP_201_CREATED,
)
async def update_network_clinic(
    bitrix_network_clinic_id: int,
    data: CreateNetworkClinicSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.network_clinic.update_network_clinic(
        data=data,
        bitrix_id=bitrix_network_clinic_id,
        bitrix_user_id=current_user.bitrix_user_id,
    )


@router.delete(
    "/{bitrix_network_clinic_id}",
    description="Удаление филиала.",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_network_clinic(
    bitrix_network_clinic_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    await uow.network_clinic.delete_network_clinic(bitrix_id=bitrix_network_clinic_id)


@router.get(
    "/clinic/{clinic_id}",
    description="Получение списка филиалов для конкретной компании с пагинацией и сортировкой.",
    response_model=PaginatedResponse,
    status_code=status.HTTP_200_OK,
)
async def get_network_clinics_by_clinic_id(
    clinic_id: int,
    page: int = Query(1, ge=1, description="Номер страницы"),
    page_size: int = Query(
        10, ge=1, le=100, description="Количество элементов на странице"
    ),
    sort_by: str = Query("name", description="Поле для сортировки"),
    sort_direction: str = Query("asc", description="Направление сортировки (asc/desc)"),
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    result, total = await uow.network_clinic.get_network_clinics_by_clinic_id(
        clinic_id=clinic_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_direction=sort_direction,
    )

    return PaginatedResponse(
        data=result,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/clinic_update_network",
    description="Обновление поля is_network у компаний.",
    status_code=status.HTTP_200_OK,
)
async def clinic_update_network_clinic(
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.network_clinic.clinic_update_network_clinic()


@router.post(
    "/sync-network-clinics-to-bitrix",
    description="Синхронизация всех филиалов c bitrix.",
    status_code=status.HTTP_200_OK,
)
async def bitrix_sync_network_clinics(
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.network_clinic.to_bitrix_sync_network_clinics(
        current_user=current_user
    )


@router.post(
    "/sync-network-clinics-from-bitrix",
    description="Обновление филиалов в бд из bitrix.",
    status_code=status.HTTP_200_OK,
)
async def bitrix_sync_network_clinics(
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.network_clinic.from_bitrix_sync_network_clinics()


@router.post(
    "/doctor",
    description="Получение контакта филиала.",
    status_code=status.HTTP_200_OK,
)
async def get_doctor(
    company_id: int = Query(),
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.network_clinic.get_doctor(company_id=company_id)
