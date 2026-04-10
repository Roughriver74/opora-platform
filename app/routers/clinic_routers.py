import json
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from starlette.responses import JSONResponse

from app.schemas.clinic_schema import (
    AddressSchema,
    AdvancedFilterParams,
    ClinicCreate,
    ClinicResponseBase,
    ClinicUpdate,
    FilterGroup,
    GetAddressSchema,
    PaginatedResponse,
    UpdateLocalAddressSchema,
)
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
async def get_clinics(
    current_user=Depends(get_current_user),
    filter_groups: Optional[str] = Query(
        None, description="Advanced filters JSON string"
    ),
    global_logical_operator: str = Query(
        "AND", description="Global logical operator for filter groups"
    ),
    region: Optional[str] = Query(None, description="Filter by specific region"),
    name: Optional[str] = Query(None, description="Filter by name"),
    inn: Optional[str] = Query(None, description="Filter by INN"),
    company_type: Optional[str] = Query(None, description="Filter by company type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    sort_by: Optional[str] = Query("name", description="Field to sort by"),
    sort_direction: Optional[str] = Query(
        "asc", description="Sort direction (asc or desc)"
    ),
    uow: UnitOfWork = Depends(get_uow),
):
    """Получить список клиник согласно условиям."""

    # Парсим сложные фильтры из JSON строки
    filter_groups_parsed = None
    if filter_groups:
        try:
            filter_groups_data = json.loads(filter_groups)
            filter_groups_parsed = [
                FilterGroup(**group) for group in filter_groups_data
            ]
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid filter_groups format: {e}"
            )

    filter_params = AdvancedFilterParams(
        filter_groups=filter_groups_parsed,
        global_logical_operator=global_logical_operator,
        region=region,
        name=name,
        inn=inn,
        company_type=company_type,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_direction=sort_direction,
    )

    return await uow.clinic.get_clinic(
        current_user=current_user,
        filter_params=filter_params,
    )


@router.get("/search/inn/{inn}", status_code=status.HTTP_200_OK)
async def search_clinics_by_inn(
    inn: str,
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Search clinics by INN (Bitrix24 or local DB)."""
    companies = await uow.clinic.search_companies_by_inn(inn, current_user=current_user)
    return {"companies": companies}


@router.get("/search", status_code=status.HTTP_200_OK)
async def search_clinics(
    term: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Search clinics by name or other criteria (Bitrix24 or local DB)."""
    companies = await uow.clinic.search_companies_by_name(term, current_user=current_user)
    return {"companies": companies}


@router.get(
    "/update_company_address_local_db",
    status_code=status.HTTP_200_OK,
)
async def update_company_address_local_db(
    uow: UnitOfWork = Depends(get_uow),
):
    return await uow.clinic.update_company_address_local_db()


@router.get(
    "/get-company-by-address",
    status_code=status.HTTP_200_OK,
)
async def set_company_address(
    street: str = Query(),
    build_number: str = Query(),
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.clinic.get_company_by_address(
        street=street, build_number=build_number
    )


@router.get("/bitrix/{company_id}", status_code=status.HTTP_200_OK)
async def get_clinic_by_bitrix_id(
    company_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get clinic data from Bitrix24 by ID."""
    return await uow.clinic.get_company(company_id)


@router.get("/{clinic_id}")
async def get_clinic(
    clinic_id: int,
    current_user=Depends(get_current_user),
    sync_with_bitrix: bool = Query(
        False, description="Синхронизировать данные с Bitrix24"
    ),
    uow: UnitOfWork = Depends(get_uow),
):
    """Get a specific clinic with optional Bitrix24 synchronization."""
    return await uow.clinic.get_clinic_local_db(
        clinic_id=clinic_id, sync_with_bitrix=sync_with_bitrix, current_user=current_user
    )


@router.post("/", response_model=ClinicResponseBase)
async def create_clinic(
    clinic: ClinicCreate,
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Create a new clinic and sync with Bitrix24."""
    return await uow.clinic.create_clinic(clinic=clinic, current_user=current_user)


@router.put("/{clinic_id}", response_model=ClinicResponseBase)
async def update_clinic(
    clinic_id: int,
    clinic: ClinicUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Update a clinic and sync changes with Bitrix24."""
    return await uow.clinic.update_clinic(clinic_id=clinic_id, clinic=clinic, current_user=current_user)


@router.post("/bitrix/update")
async def update_clinic_in_bitrix(
    data: Dict[str, Any] = Body(...),
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Обновляет данные клиники напрямую в Bitrix24 без сохранения в локальной базе данных."""
    return await uow.clinic.update_clinic_in_bitrix(data=data)


@router.post("/sync", response_model=List[ClinicResponseBase])
async def sync_clinics_from_bitrix(
    uow: UnitOfWork = Depends(get_uow), current_user=Depends(get_current_user)
):
    """Sync clinics from Bitrix24 to local database."""
    return await uow.clinic.sync_clinics_from_bitrix()


@router.post("/upload-excel", response_model=dict)
async def upload_excel_file(
    file: UploadFile = File(...),
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Upload an Excel file for company import."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can upload Excel files",
        )

    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are allowed",
        )

    return await uow.clinic.upload_excel_file(file=file)


@router.post("/{clinic_id}/create-in-bitrix", response_model=dict)
async def create_clinic_in_bitrix(
    clinic_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Create a clinic in Bitrix24 based on local database information."""
    return await uow.clinic.create_clinic_in_bitrix(clinic_id=clinic_id)


@router.post("/{clinic_id}/find-or-create-in-bitrix", response_model=dict)
async def find_or_create_in_bitrix(
    clinic_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """
    Найти компанию в Битрикс24 по ИНН, либо создать её, если не найдена.
    Затем обновить локальную запись ID из Битрикса.
    """
    return await uow.clinic.find_or_create_in_bitrix(clinic_id=clinic_id)


@router.post("/set-company-address", status_code=status.HTTP_201_CREATED)
async def set_company_address(
    data: UpdateLocalAddressSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    updating_data = data.model_dump(exclude_none=True, exclude_unset=True)
    return await uow.clinic.update_company_address(data=updating_data)


@router.post(
    "/get-company-address",
    status_code=status.HTTP_200_OK,
)
async def set_company_address(
    data: GetAddressSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.clinic.get_company_address(data=data)
