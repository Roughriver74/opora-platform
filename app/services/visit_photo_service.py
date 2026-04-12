import os
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import VisitPhoto, Visit
from app.config import UPLOAD_PHOTOS_DIR
from app.services.plan_limits_service import check_photos_limit


async def upload_photo(
    session: AsyncSession,
    visit_id: int,
    org_id: int,
    user_id: int,
    file: UploadFile,
    latitude: float | None = None,
    longitude: float | None = None,
) -> VisitPhoto:
    # Verify visit exists and belongs to org
    result = await session.execute(
        select(Visit).where(Visit.id == visit_id, Visit.organization_id == org_id)
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Визит не найден")

    # Check photo limit
    await check_photos_limit(session, org_id, visit_id)

    # Save file
    org_dir = os.path.join(UPLOAD_PHOTOS_DIR, str(org_id))
    os.makedirs(org_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(org_dir, filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    photo = VisitPhoto(
        visit_id=visit_id,
        organization_id=org_id,
        file_path=file_path,
        latitude=latitude,
        longitude=longitude,
        taken_at=datetime.now(timezone.utc),
        file_size_bytes=len(content),
    )
    session.add(photo)
    await session.commit()
    await session.refresh(photo)
    return photo


async def get_visit_photos(
    session: AsyncSession,
    visit_id: int,
    org_id: int,
) -> list[VisitPhoto]:
    result = await session.execute(
        select(VisitPhoto)
        .where(VisitPhoto.visit_id == visit_id, VisitPhoto.organization_id == org_id)
        .order_by(VisitPhoto.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def delete_photo(
    session: AsyncSession,
    photo_id: int,
    org_id: int,
) -> None:
    result = await session.execute(
        select(VisitPhoto).where(VisitPhoto.id == photo_id, VisitPhoto.organization_id == org_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    if os.path.exists(photo.file_path):
        os.remove(photo.file_path)

    await session.delete(photo)
    await session.commit()
