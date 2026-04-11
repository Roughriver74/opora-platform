from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, RootModel

from app.config import CLINIC_SCHEMA_EXTRA
from app.utils.schema_decorator import add_dynamic_properties


class DynamicFields(RootModel):
    """
    Схема для динамических полей, определенных в админ-панели
    """

    root: Dict[str, Any] = Field(default_factory=dict)


class ClinicBase(BaseModel):
    name: str
    company_type: Optional[str] = "CUSTOMER"
    dynamic_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    region: str
    uid_1c: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    main_manager: Optional[str] = None
    last_sale_date: Optional[datetime] = None
    document_amount: Optional[str] = None
    last_visit_date: Optional[datetime] = None
    visits_count: Optional[int] = 0
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    is_network: Optional[bool] = None

    class Config:
        from_attributes = True


class ClinicCreate(ClinicBase):
    bitrix_id: Optional[int] = None

    class Config:
        schema_extra = CLINIC_SCHEMA_EXTRA


class ClinicUpdate(BaseModel):
    name: Optional[str] = None
    company_type: Optional[str] = None
    dynamic_fields: Optional[Dict[str, Any]] = None
    region: Optional[str] = None
    uid_1c: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    main_manager: Optional[str] = None
    last_sale_date: Optional[datetime] = None
    document_amount: Optional[str] = None
    last_visit_date: Optional[datetime] = None
    visits_count: Optional[int] = None
    is_network: Optional[bool] = None


class Clinic(ClinicBase):
    id: int
    bitrix_id: Optional[int] = None
    last_synced: Optional[datetime] = None
    sync_status: Optional[str] = None
    last_visit_date: Optional[datetime] = None
    visits_count: Optional[int] = None

    model_config = {"from_attributes": True}


class PaginatedResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    total_pages: int


@add_dynamic_properties
class ClinicResponseBase(BaseModel):
    id: int
    name: str
    bitrix_id: Optional[int] = None
    sync_status: Optional[str] = None
    sync_error: Optional[str] = None
    last_synced: Optional[datetime] = None
    dynamic_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_network: Optional[bool] = None

    def get_dynamic_field(self, key: str, default: Any = None) -> Any:
        return self.dynamic_fields.get(key, default) if self.dynamic_fields else default

    model_config = {"from_attributes": True}


class AddressSchema(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    street: Optional[str] = None
    number: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    company_id: int
    is_network: bool = False

    model_config = {"from_attributes": True, "extra": "ignore"}


class UpdateLocalAddressSchema(AddressSchema):
    clinic_id: Optional[int] = None


class GetAddressSchema(BaseModel):
    company_id: int
    is_network: bool


class FilterCondition(BaseModel):
    field: str
    operator: str
    value: Optional[Any] = None
    values: Optional[List[Any]] = None


class FilterGroup(BaseModel):
    conditions: List[FilterCondition]
    logical_operator: str = "AND"


class AdvancedFilterParams(BaseModel):
    filter_groups: Optional[List[FilterGroup]] = None
    global_logical_operator: str = "AND"
    search: Optional[str] = None  # Generic search by name or INN
    region: Optional[str] = None
    name: Optional[str] = None
    inn: Optional[str] = None
    company_type: Optional[str] = None
    page: int = 1
    page_size: int = 10
    sort_by: str = "name"
    sort_direction: str = "asc"
