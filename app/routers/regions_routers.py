from fastapi import APIRouter, Depends

from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter(prefix="/regions")


@router.get("", response_model=dict)
async def get_available_regions(
    uow: UnitOfWork = Depends(get_uow), current_user=Depends(get_current_user)
):
    """Получение списка всех доступных регионов из базы данных компаний"""
    return await uow.clinic.get_available_regions()
