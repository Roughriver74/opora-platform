import io
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Header,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from openpyxl import Workbook
from starlette.responses import JSONResponse, StreamingResponse

from app.database_session import SessionLocal
from app.models import Company, Organization
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
from app.utils.utils import get_current_admin_user, get_current_user
from sqlalchemy import select

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


EXPORT_COLUMNS = [
    "Название",
    "ИНН",
    "КПП",
    "Регион",
    "Тип компании",
    "Менеджер",
    "Дата последней реализации",
]

IMPORT_COLUMNS = [
    "Название",
    "ИНН",
    "КПП",
    "Регион",
    "Тип компании",
    "Менеджер",
]


def _companies_to_rows(companies: list) -> list[dict]:
    """Convert Company ORM objects to dicts matching export column names."""
    rows = []
    for c in companies:
        rows.append(
            {
                "Название": c.name or "",
                "ИНН": c.inn or "",
                "КПП": c.kpp or "",
                "Регион": c.region or "",
                "Тип компании": c.company_type or "",
                "Менеджер": c.main_manager or "",
                "Дата последней реализации": (
                    c.last_sale_date.strftime("%d.%m.%Y") if c.last_sale_date else ""
                ),
            }
        )
    return rows


def _make_workbook(rows: list[dict], columns: list[str]) -> Workbook:
    """Create an openpyxl Workbook from row dicts."""
    wb = Workbook()
    ws = wb.active
    ws.append(columns)
    for row in rows:
        ws.append([row.get(col, "") for col in columns])
    return wb


def _workbook_to_bytes(wb: Workbook) -> bytes:
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


@router.get("/export")
async def export_companies(
    current_user=Depends(get_current_admin_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Export all companies for the current organization to an Excel file."""
    org_id = current_user.organization_id

    # Fetch organization slug for filename
    org_result = await uow.session.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = org_result.scalars().first()
    org_slug = org.slug if org and org.slug else str(org_id)

    # Fetch all companies for this org
    result = await uow.session.execute(
        select(Company).where(Company.organization_id == org_id).order_by(Company.name)
    )
    companies = result.scalars().all()

    rows = _companies_to_rows(companies)
    wb = _make_workbook(rows, EXPORT_COLUMNS)
    content = _workbook_to_bytes(wb)

    today = datetime.now().strftime("%Y-%m-%d")
    # Use ASCII-safe filename for Content-Disposition header
    safe_slug = org_slug.encode("ascii", "ignore").decode() or "org"
    filename = f"companies_{safe_slug}_{today}.xlsx"

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/import-template")
async def download_import_template(
    current_user=Depends(get_current_admin_user),
):
    """Download an empty Excel template for company import."""
    wb = _make_workbook([], IMPORT_COLUMNS)
    content = _workbook_to_bytes(wb)

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="import_template.xlsx"'},
    )


@router.post("/import")
async def import_companies(
    file: UploadFile = File(...),
    current_user=Depends(get_current_admin_user),
    uow: UnitOfWork = Depends(get_uow),
):
    """Import companies from an uploaded Excel file (upsert by INN)."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are allowed",
        )

    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents), dtype=str)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read Excel file: {e}",
        )

    # Normalize column names (strip whitespace)
    df.columns = [str(c).strip() for c in df.columns]

    if "Название" not in df.columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Required column "Название" not found in the uploaded file',
        )

    org_id = current_user.organization_id
    imported = 0
    updated = 0
    errors: list[str] = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # Excel row number (header is row 1)

        name = str(row.get("Название", "")).strip() if pd.notna(row.get("Название")) else ""
        if not name:
            # Skip empty rows
            continue

        inn = str(row.get("ИНН", "")).strip() if pd.notna(row.get("ИНН")) else ""
        kpp = str(row.get("КПП", "")).strip() if pd.notna(row.get("КПП")) else ""
        region = str(row.get("Регион", "")).strip() if pd.notna(row.get("Регион")) else ""
        company_type = str(row.get("Тип компании", "")).strip() if pd.notna(row.get("Тип компании")) else ""
        manager = str(row.get("Менеджер", "")).strip() if pd.notna(row.get("Менеджер")) else ""

        if not region:
            errors.append(f"Row {row_num}: missing required field 'Регион' for '{name}'")
            continue

        try:
            existing = None
            if inn:
                result = await uow.session.execute(
                    select(Company).where(
                        Company.inn == inn,
                        Company.organization_id == org_id,
                    )
                )
                existing = result.scalars().first()

            if existing:
                existing.name = name
                if kpp:
                    existing.kpp = kpp
                if region:
                    existing.region = region
                if company_type:
                    existing.company_type = company_type
                if manager:
                    existing.main_manager = manager
                updated += 1
            else:
                company = Company(
                    name=name,
                    inn=inn or None,
                    kpp=kpp or None,
                    region=region,
                    company_type=company_type or "CUSTOMER",
                    main_manager=manager or None,
                    organization_id=org_id,
                    sync_status="pending",
                )
                uow.session.add(company)
                imported += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    try:
        await uow.session.commit()
    except Exception as e:
        await uow.session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during import: {e}",
        )

    return {"imported": imported, "updated": updated, "errors": errors}


@router.post("/import-api")
async def import_companies_via_api_key(
    file: UploadFile = File(...),
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """Import companies via external API key (no JWT required)."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Excel files (.xlsx, .xls) are allowed",
        )

    async with SessionLocal() as session:
        result = await session.execute(
            select(Organization).where(Organization.api_key == x_api_key)
        )
        org = result.scalars().first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )
        org_id = org.id

        contents = await file.read()
        try:
            df = pd.read_excel(io.BytesIO(contents), dtype=str)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read Excel file: {e}",
            )

        df.columns = [str(c).strip() for c in df.columns]

        if "Название" not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Required column "Название" not found in the uploaded file',
            )

        imported = 0
        updated = 0
        errors: list[str] = []

        for idx, row in df.iterrows():
            row_num = idx + 2

            name = str(row.get("Название", "")).strip() if pd.notna(row.get("Название")) else ""
            if not name:
                continue

            inn = str(row.get("ИНН", "")).strip() if pd.notna(row.get("ИНН")) else ""
            kpp = str(row.get("КПП", "")).strip() if pd.notna(row.get("КПП")) else ""
            region = str(row.get("Регион", "")).strip() if pd.notna(row.get("Регион")) else ""
            company_type = str(row.get("Тип компании", "")).strip() if pd.notna(row.get("Тип компании")) else ""
            manager = str(row.get("Менеджер", "")).strip() if pd.notna(row.get("Менеджер")) else ""

            if not region:
                errors.append(f"Row {row_num}: missing required field 'Регион' for '{name}'")
                continue

            try:
                existing = None
                if inn:
                    res = await session.execute(
                        select(Company).where(
                            Company.inn == inn,
                            Company.organization_id == org_id,
                        )
                    )
                    existing = res.scalars().first()

                if existing:
                    existing.name = name
                    if kpp:
                        existing.kpp = kpp
                    if region:
                        existing.region = region
                    if company_type:
                        existing.company_type = company_type
                    if manager:
                        existing.main_manager = manager
                    updated += 1
                else:
                    company = Company(
                        name=name,
                        inn=inn or None,
                        kpp=kpp or None,
                        region=region,
                        company_type=company_type or "CUSTOMER",
                        main_manager=manager or None,
                        organization_id=org_id,
                        sync_status="pending",
                    )
                    session.add(company)
                    imported += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during import: {e}",
            )

    return {"imported": imported, "updated": updated, "errors": errors}


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
    return await uow.clinic.sync_clinics_from_bitrix(current_user=current_user)


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
