from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class VisitPhotoResponse(BaseModel):
    id: int
    visit_id: int
    organization_id: int
    file_path: str
    thumbnail_path: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    taken_at: Optional[datetime] = None
    uploaded_at: datetime
    file_size_bytes: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
