from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.schemas.contact_schema import DoctorBitrixSchema
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter()


# ── Pydantic schemas for local doctor CRUD ────────────────────────


class DoctorCreate(BaseModel):
    name: str
    bitrix_id: Optional[int] = None
    dynamic_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    dynamic_fields: Optional[Dict[str, Any]] = None


class DoctorResponse(BaseModel):
    id: int
    name: Optional[str] = None
    bitrix_id: Optional[int] = None
    sync_status: Optional[str] = None
    sync_error: Optional[str] = None
    last_synced: Optional[str] = None
    dynamic_fields: Optional[Dict[str, Any]] = None
    organization_id: Optional[int] = None

    model_config = {"from_attributes": True}


# ── Bitrix-related endpoints (must come before /{doctor_id}) ─────


@router.get("/bitrix/doctors", status_code=status.HTTP_200_OK)
async def get_doctors_from_bitrix(
    company_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get all doctors from Bitrix24."""
    return await uow.doctor.get_doctors_from_bitrix(company_id=company_id)


@router.post("/bitrix/doctor-create", status_code=status.HTTP_201_CREATED)
async def create_doctor_in_bitrix(
    data: DoctorBitrixSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Create doctor in Bitrix24."""
    return await uow.doctor.create_doctor_bitrix(data=data)


@router.delete("/bitrix/doctor-delete", status_code=status.HTTP_200_OK)
async def delete_doctor_in_bitrix(
    doctor_bitrix_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Delete doctor in Bitrix24."""
    return await uow.doctor.delete_doctor_bitrix(doctor_bitrix_id=doctor_bitrix_id)


@router.post("/sync", status_code=status.HTTP_200_OK)
async def sync_doctors_from_bitrix(
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Sync doctors from Bitrix24 to local database."""
    result = await uow.doctor.sync_doctors_from_bitrix(current_user=current_user)
    return {"synced": len(result), "message": f"Синхронизировано {len(result)} докторов"}


# ── Local CRUD endpoints ─────────────────────────────────────────


@router.get("/")
async def get_doctors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get doctors with pagination."""
    return await uow.doctor.get_doctors_paginated(
        current_user=current_user,
        page=page,
        page_size=page_size,
        search=search,
    )


@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    data: DoctorCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Create a new doctor in the local database."""
    return await uow.doctor.create_doctor_local(
        data=data.model_dump(), current_user=current_user
    )


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get a specific doctor by ID."""
    return await uow.doctor.get_doctor(
        doctor_id=doctor_id, current_user=current_user
    )


@router.put("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: int,
    data: DoctorUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Update an existing doctor."""
    return await uow.doctor.update_doctor_local(
        doctor_id=doctor_id,
        data=data.model_dump(exclude_unset=True),
        current_user=current_user,
    )
