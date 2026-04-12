from pydantic import BaseModel


class SetupRequest(BaseModel):
    template_id: str
    company_name: str
    team_size: str  # "1-5", "6-20", "21-50", "50+"


class SetupResponse(BaseModel):
    template_applied: str
    template_name: str
    form_fields_count: int
    checklist_items_count: int
    statuses: list[str]
    message: str


class TemplateInfo(BaseModel):
    id: str
    name: str
    description: str
    icon: str
