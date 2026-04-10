# app/routers/form_template_routers.py
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.models import FormTemplate
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_admin_user, get_current_user

router = APIRouter(prefix="/form-templates", tags=["form-templates"])


ENTITY_TYPES = {"visit", "clinic", "doctor", "contact", "network_clinic"}

DEFAULT_FIELDS: Dict[str, List[dict]] = {
    "visit": [
        {"key": "visit_type", "label": "Тип визита", "type": "select", "required": True,
         "options": ["Первичный", "Повторный", "Сервисный"]},
        {"key": "comment", "label": "Комментарий", "type": "textarea", "required": False},
        {"key": "with_distributor", "label": "С дистрибьютором", "type": "checkbox", "required": False},
    ],
    "clinic": [],
    "doctor": [],
    "contact": [],
    "network_clinic": [],
}


class BitrixValueMapping(BaseModel):
    app_value: str
    bitrix_value: str


class FieldDefinition(BaseModel):
    key: str
    label: str
    type: str
    required: bool = False
    options: Optional[List[str]] = None
    bitrix_field_id: Optional[str] = None
    bitrix_field_type: Optional[str] = None
    bitrix_value_mapping: Optional[List[Dict[str, Any]]] = None


class FormTemplateResponse(BaseModel):
    id: Optional[int] = None
    organization_id: Optional[int] = None
    entity_type: str
    fields: List[FieldDefinition]

    class Config:
        from_attributes = True


class FormTemplateUpdate(BaseModel):
    fields: List[FieldDefinition]


@router.get("/{entity_type}", response_model=FormTemplateResponse)
async def get_form_template(
    entity_type: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown entity_type: {entity_type}")

    template = (
        await uow.session.execute(
            select(FormTemplate).where(
                FormTemplate.organization_id == current_user.organization_id,
                FormTemplate.entity_type == entity_type,
            )
        )
    ).scalars().first()

    if not template:
        return FormTemplateResponse(
            entity_type=entity_type,
            fields=[FieldDefinition(**f) for f in DEFAULT_FIELDS.get(entity_type, [])],
        )

    return template


@router.put("/{entity_type}", response_model=FormTemplateResponse)
async def update_form_template(
    entity_type: str,
    payload: FormTemplateUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_admin_user),
):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown entity_type: {entity_type}")

    template = (
        await uow.session.execute(
            select(FormTemplate).where(
                FormTemplate.organization_id == current_user.organization_id,
                FormTemplate.entity_type == entity_type,
            )
        )
    ).scalars().first()

    fields_data = [f.dict(exclude_none=False) for f in payload.fields]

    if template is None:
        template = FormTemplate(
            organization_id=current_user.organization_id,
            entity_type=entity_type,
            fields=fields_data,
        )
        uow.session.add(template)
    else:
        template.fields = fields_data
        flag_modified(template, "fields")

    await uow.session.commit()
    await uow.session.refresh(template)
    return template
