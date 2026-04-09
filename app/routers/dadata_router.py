from fastapi import APIRouter, Depends

from app.schemas.dadata_schema import DadataSchema, DistanceCheckSchema
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter()


@router.post(
    "/get-dadata",
)
async def get_network_clinics(
    data: DadataSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.dadata.get_dadata(data=data)


@router.post(
    "/check-exist-address",
)
async def check_exist_address(
    data: DadataSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.dadata.check_exist_address(data=data)


@router.post(
    "/check-distance",
)
async def check_distance(
    data: DistanceCheckSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.dadata.check_distance(data=data)
