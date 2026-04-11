from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, RootModel


# В Pydantic v2 вместо __root__ используется RootModel
class DynamicFields(RootModel):
    """
    Схема для динамических полей, определенных в админ-панели
    """

    root: Dict[str, Any] = Field(default_factory=dict)


class ContactBase(BaseModel):
    name: str
    contact_type: Optional[str] = "LPR"
    dynamic_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ContactCreate(ContactBase):
    bitrix_id: Optional[int] = None
    company_id: Optional[int] = None  # Link contact to company on creation


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    contact_type: Optional[str] = None
    dynamic_fields: Optional[Dict[str, Any]] = None


class Contact(ContactBase):
    id: int
    bitrix_id: Optional[int] = None
    last_synced: Optional[datetime] = None
    sync_status: Optional[str] = None

    model_config = {"from_attributes": True}


class ContactResponseBase(BaseModel):
    id: int
    name: str
    bitrix_id: Optional[int] = None
    contact_type: Optional[str] = None
    sync_status: Optional[str] = None
    sync_error: Optional[str] = None
    last_synced: Optional[datetime] = None
    dynamic_fields: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class PhoneEmailSchema(BaseModel):
    ID: Optional[int] = None
    VALUE_TYPE: Optional[str] = Field(default="WORK")
    VALUE: Optional[str] = None
    TYPE_ID: Optional[str] = None

    model_config = {"extra": "ignore"}


class DoctorBitrixSchema(BaseModel):
    NAME: Optional[str] = None
    SECOND_NAME: Optional[str] = None
    LAST_NAME: Optional[str] = None
    COMPANY_ID: int
    EMAIL: Optional[List[PhoneEmailSchema]] = None
    PHONE: Optional[List[PhoneEmailSchema]] = None
    TYPE_ID: Optional[str] = Field(default="CLIENT")

    model_config = {"extra": "ignore"}
