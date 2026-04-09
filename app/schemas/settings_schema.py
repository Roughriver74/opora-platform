from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GlobalSettingBase(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class GlobalSettingCreate(GlobalSettingBase):
    pass


class GlobalSettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None


class GlobalSetting(GlobalSettingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
