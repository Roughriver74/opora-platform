from fastapi import APIRouter, Depends, status

from app.schemas.contact_schema import DoctorBitrixSchema
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter()


@router.get("/bitrix/doctors", status_code=status.HTTP_200_OK)
async def get_doctors_from_bitrix(
    company_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get all doctors from Bitrix24."""
    return await uow.doctor.get_doctors_from_bitrix(company_id=company_id)


@router.post("/bitrix/doctor-create", status_code=status.HTTP_201_CREATED)
async def get_doctors_from_bitrix(
    data: DoctorBitrixSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Create doctor in Bitrix24."""
    return await uow.doctor.create_doctor_bitrix(data=data)


@router.delete("/bitrix/doctor-delete", status_code=status.HTTP_200_OK)
async def get_doctors_from_bitrix(
    doctor_bitrix_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Delete doctor in Bitrix24."""
    return await uow.doctor.delete_doctor_bitrix(doctor_bitrix_id=doctor_bitrix_id)
