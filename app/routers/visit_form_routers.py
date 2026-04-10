from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.models import FormTemplate
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_admin_user, get_current_user

router = APIRouter()

# --------------- Schemas (kept for backward compatibility) ---------------


class FieldDefinition(BaseModel):
    key: str
    label: str
    type: str  # text, textarea, select, checkbox, date, number
    required: bool = False
    options: Optional[List[str]] = None  # Only for select type


class VisitFormTemplateResponse(BaseModel):
    id: Optional[int] = None
    organization_id: Optional[int] = None
    fields: List[FieldDefinition]

    class Config:
        from_attributes = True


class VisitFormTemplateUpdate(BaseModel):
    fields: List[FieldDefinition]


# --------------- Default template ---------------

DEFAULT_FIELDS: List[dict] = [
    {
        "key": "visit_type",
        "label": "Тип визита",
        "type": "select",
        "required": True,
        "options": ["Первичный", "Повторный", "Сервисный"],
    },
    {
        "key": "comment",
        "label": "Комментарий",
        "type": "textarea",
        "required": False,
    },
    {
        "key": "with_distributor",
        "label": "С дистрибьютором",
        "type": "checkbox",
        "required": False,
    },
]


# --------------- Endpoints (backward-compatible aliases for /form-templates/visit) ---------------


@router.get("/", response_model=VisitFormTemplateResponse)
async def get_visit_form_template(
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Backward-compatible alias for GET /form-templates/visit."""
    template = (
        await uow.session.execute(
            select(FormTemplate).where(
                FormTemplate.organization_id == current_user.organization_id,
                FormTemplate.entity_type == "visit",
            )
        )
    ).scalars().first()

    if template is None:
        return VisitFormTemplateResponse(
            fields=[FieldDefinition(**f) for f in DEFAULT_FIELDS]
        )

    return VisitFormTemplateResponse(
        id=template.id,
        organization_id=template.organization_id,
        fields=[FieldDefinition(**{k: v for k, v in f.items() if k in FieldDefinition.model_fields}) for f in (template.fields or [])],
    )


@router.put("/", response_model=VisitFormTemplateResponse)
async def update_visit_form_template(
    payload: VisitFormTemplateUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_admin_user),
):
    """Backward-compatible alias for PUT /form-templates/visit."""
    org_id = current_user.organization_id

    template = (
        await uow.session.execute(
            select(FormTemplate).where(
                FormTemplate.organization_id == org_id,
                FormTemplate.entity_type == "visit",
            )
        )
    ).scalars().first()

    fields_data = [f.model_dump() for f in payload.fields]

    if template is None:
        template = FormTemplate(
            organization_id=org_id,
            entity_type="visit",
            fields=fields_data,
        )
        uow.session.add(template)
    else:
        template.fields = fields_data
        flag_modified(template, "fields")

    await uow.session.commit()
    await uow.session.refresh(template)

    return VisitFormTemplateResponse(
        id=template.id,
        organization_id=template.organization_id,
        fields=[FieldDefinition(**{k: v for k, v in f.items() if k in FieldDefinition.model_fields}) for f in (template.fields or [])],
    )
