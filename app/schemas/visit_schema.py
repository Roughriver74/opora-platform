from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, RootModel, validator

from app.emuns.visit_enum import VisitStatus


class DynamicFields(RootModel):
    """
    Схема для динамических полей, которые определяются в админ-панели
    и могут быть разными для разных типов сущностей
    """

    root: Dict[str, Any] = Field(default_factory=dict)


class VisitBase(BaseModel):
    company_id: int
    date: Union[datetime, str, date]
    status: str = VisitStatus.PLANNED.value
    visit_type: Optional[str] = None
    comment: Optional[str] = None
    with_distributor: bool = False
    sansus: bool = False
    doctors: List[int] = []
    dynamic_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator("date", pre=True)
    def validate_date(cls, v):
        if isinstance(v, (datetime, date)):
            return v

        if isinstance(v, str):
            # Проверяем, есть ли разделитель даты и времени
            if "T" not in v and "t" not in v and " " not in v and "_" not in v:
                # Если нет разделителя, добавляем его
                now = datetime.now()
                time_str = f"T{now.hour:02d}:{now.minute:02d}:00"
                v = f"{v}{time_str}"

            # Удаляем Z и заменяем на +00:00 для совместимости с fromisoformat
            v = v.replace("Z", "+00:00")

            try:
                return datetime.fromisoformat(v)
            except ValueError as e:
                raise ValueError(f"Invalid date format: {e}")

        raise ValueError(f"Invalid date type: {type(v)}")


class VisitCreate(VisitBase):
    geo: bool = False


class ContactResponse(BaseModel):
    id: int
    name: str
    position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bitrix_id: Optional[int] = None

    model_config = {"from_attributes": True, "extra": "ignore"}


class CompanyResponse(BaseModel):
    id: int
    name: str
    bitrix_id: Optional[int] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    dynamic_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    contacts: Optional[List[ContactResponse]] = None

    model_config = {"from_attributes": True, "extra": "ignore"}


class VisitResponseBase(BaseModel):
    id: int
    company_id: int
    user_id: Optional[int] = None
    date: datetime
    dynamic_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    bitrix_id: Optional[int] = None
    sync_status: Optional[str] = None
    last_synced: Optional[datetime] = None
    company: Optional[CompanyResponse] = None
    status: Optional[str] = None

    model_config = {"from_attributes": True, "extra": "ignore"}


class StatusUpdate(BaseModel):
    stageId: str


class VisitDeleteSchema(BaseModel):
    visit_id: Optional[int] = None
    visit_bitrix_id: Optional[int] = None

    model_config = {"extra": "ignore"}
