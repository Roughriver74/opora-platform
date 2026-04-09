from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CreateNetworkClinicSchema(BaseModel):
    bitrix_id: Optional[int] = None
    doctor_bitrix_id: Optional[list] = None
    dynamic_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    sync_status: Optional[str] = None
    name: str
    company_id: Optional[int] = None

    model_config = {"extra": "ignore", "from_attributes": True}


class ResponseNetworkClinicSchema(CreateNetworkClinicSchema):
    id: int


class ResponseNetworkClinicWithClinicBitrixIdSchema(ResponseNetworkClinicSchema):
    id: int
    bitrixMainClinicID: int


class PaginatedResponse(BaseModel):
    data: List[ResponseNetworkClinicSchema]
    total: int
    page: int
    page_size: int
