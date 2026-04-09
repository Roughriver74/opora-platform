from typing import Optional

from pydantic import BaseModel


class ExtendedBaseModel(BaseModel):
    model_config = {"extra": "ignore"}


class TaskSchema(ExtendedBaseModel):
    title: str
    description: str
    responsible_id: int
    client_info: str = ""
    company_bitrix_id: int
    visit_id: Optional[int] = None
    deadline: Optional[str] = None
    observer_ids: Optional[list] = None
    tags: Optional[str] = None


class DealSchema(ExtendedBaseModel):
    title: str
    description: str
    client_id: int
    contact_person: str
    observer_ids: Optional[list] = None
