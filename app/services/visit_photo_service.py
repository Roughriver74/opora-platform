import os
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import VisitPhoto, Visit
from app.config import UPLOAD_PHOTOS_DIR
from app.services.plan_limits_service import check_photos_limit

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


async def upload_photo(
    session: AsyncSession,
    visit_id: int,
    org_id: int,
    user_id: int,
    file: UploadFile,
    latitude: float | None = None,
    longitude: float | None = None,
    taken_at: datetime | None = None,
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

    # Validate file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP, HEIC")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Неподдерживаемое расширение файла")

    # Read with size limit
    MAX_BYTES = 10 * 1024 * 1024  # 10 MB
    content = await file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Файл слишком большой (максимум 10 МБ)")

    # Build paths
    filename = f"{uuid.uuid4().hex}{ext}"
    relative_path = os.path.join(str(org_id), filename)  # e.g. "42/abc123.jpg"
    full_path = os.path.join(UPLOAD_PHOTOS_DIR, relative_path)

    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(content)

    photo = VisitPhoto(
        visit_id=visit_id,
        organization_id=org_id,
        file_path=relative_path,
        latitude=latitude,
        longitude=longitude,
        taken_at=taken_at,
        file_size_bytes=len(content),
    )
    session.add(photo)
    try:
        await session.commit()
        await session.refresh(photo)
    except Exception:
        if os.path.exists(full_path):
            os.remove(full_path)
        raise
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

    full_path = os.path.join(UPLOAD_PHOTOS_DIR, photo.file_path)
    if os.path.exists(full_path):
        os.remove(full_path)

    await session.delete(photo)
    await session.commit()
