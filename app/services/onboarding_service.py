from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm.attributes import flag_modified

from app.models import Organization, FormTemplate
from app.templates import get_template


async def apply_template(
    session: AsyncSession,
    org_id: int,
    template_id: str,
    company_name: str,
    team_size: str,
) -> dict:
    """Применить шаблон к организации: создать FormTemplate + обновить настройки."""
    template = get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Шаблон '{template_id}' не найден")

    # Получить организацию
    result = await session.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Организация не найдена")

    # Обновить название организации
    if company_name:
        org.name = company_name

    # Обновить настройки организации (поле settings: JSONB)
    org_settings = dict(org.settings or {})
    org_settings["template_id"] = template_id
    org_settings["team_size"] = team_size
    org_settings["statuses"] = template["statuses"]
    org_settings["status_labels"] = template["status_labels"]
    org_settings["role_labels"] = template["role_labels"]
    org_settings["dashboard_metrics"] = template["dashboard_metrics"]
    org_settings["onboarding_completed"] = True
    org.settings = org_settings
    flag_modified(org, "settings")

    # Удалить старые FormTemplate для visit (идемпотентность)
    await session.execute(
        delete(FormTemplate).where(
            FormTemplate.organization_id == org_id,
            FormTemplate.entity_type == "visit",
        )
    )

    # Создать FormTemplate из шаблона
    form_data = template["form_template"]
    checklist = template["checklist"]

    # Добавить чек-лист как поле типа checklist в форму
    fields = list(form_data["fields"])
    if checklist["items"]:
        fields.append({
            "id": "checklist",
            "name": checklist["name"],
            "type": "checklist",
            "required": False,
            "items": checklist["items"],
        })

    form_template = FormTemplate(
        organization_id=org_id,
        entity_type=form_data["entity_type"],
        fields=fields,
    )
    session.add(form_template)
    await session.commit()

    return {
        "template_applied": template_id,
        "template_name": template["name"],
        "form_fields_count": len(form_data["fields"]),
        "checklist_items_count": len(checklist["items"]),
        "statuses": template["statuses"],
        "message": f"Шаблон «{template['name']}» применён. Система готова к работе.",
    }
