from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.models import VisitFormTemplate
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_admin_user, get_current_user
from sqlalchemy import select

router = APIRouter()

# --------------- Schemas ---------------


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


# --------------- Endpoints ---------------


@router.get("/", response_model=VisitFormTemplateResponse)
async def get_visit_form_template(
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get the visit form template for the current user's organization.
    Returns default template if none has been configured yet."""
    result = await uow.session.execute(
        select(VisitFormTemplate).where(
            VisitFormTemplate.organization_id == current_user.organization_id
        )
    )
    template = result.scalars().first()

    if template is None:
        return VisitFormTemplateResponse(
            fields=[FieldDefinition(**f) for f in DEFAULT_FIELDS]
        )

    return VisitFormTemplateResponse(
        id=template.id,
        organization_id=template.organization_id,
        fields=[FieldDefinition(**f) for f in (template.fields or [])],
    )


@router.put("/", response_model=VisitFormTemplateResponse)
async def update_visit_form_template(
    payload: VisitFormTemplateUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_admin_user),
):
    """Create or update the visit form template for the current org.
    Only org admins can modify it."""
    org_id = current_user.organization_id

    result = await uow.session.execute(
        select(VisitFormTemplate).where(
            VisitFormTemplate.organization_id == org_id
        )
    )
    template = result.scalars().first()

    fields_data = [f.dict() for f in payload.fields]

    if template is None:
        template = VisitFormTemplate(
            organization_id=org_id,
            fields=fields_data,
        )
        uow.session.add(template)
    else:
        template.fields = fields_data
        # SQLAlchemy needs a hint that the JSONB column changed
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(template, "fields")

    await uow.session.commit()
    await uow.session.refresh(template)

    return VisitFormTemplateResponse(
        id=template.id,
        organization_id=template.organization_id,
        fields=[FieldDefinition(**f) for f in (template.fields or [])],
    )
