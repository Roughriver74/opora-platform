from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import Optional
from datetime import datetime

from app.utils.utils import get_current_user
from app.services.uow import UnitOfWork, get_uow
from app.schemas.visit_photo_schema import VisitPhotoResponse
from app.services.visit_photo_service import upload_photo, get_visit_photos, delete_photo

router = APIRouter(prefix="/visits", tags=["visit-photos"])


@router.post("/{visit_id}/photos", response_model=VisitPhotoResponse, status_code=201)
async def upload_visit_photo(
    visit_id: int,
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    taken_at: Optional[datetime] = Form(None),
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    photo = await upload_photo(
        uow.session, visit_id, current_user.organization_id,
        current_user.id, file, latitude, longitude, taken_at,
    )
    return photo


@router.get("/{visit_id}/photos", response_model=list[VisitPhotoResponse])
async def list_visit_photos(
    visit_id: int,
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    return await get_visit_photos(uow.session, visit_id, current_user.organization_id)


@router.delete("/photos/{photo_id}", status_code=204)
async def remove_photo(
    photo_id: int,
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    await delete_photo(uow.session, photo_id, current_user.organization_id)
