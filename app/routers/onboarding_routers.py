from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

from app.schemas.onboarding_schema import SetupRequest, SetupResponse, TemplateInfo
from app.services.onboarding_service import apply_template
from app.templates import list_templates

router = APIRouter(prefix="/onboarding", tags=["Онбординг"])


@router.get("/templates", response_model=list[TemplateInfo])
async def get_templates():
    """Список доступных шаблонов."""
    return list_templates()


@router.post("/setup", response_model=SetupResponse)
async def setup_organization(
    data: SetupRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Применить шаблон к организации текущего пользователя."""
    if not current_user.is_org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только администратор организации может настроить шаблон",
        )

    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь не привязан к организации",
        )

    result = await apply_template(
        session=uow.session,
        org_id=current_user.organization_id,
        template_id=data.template_id,
        company_name=data.company_name,
        team_size=data.team_size,
    )
    return result
