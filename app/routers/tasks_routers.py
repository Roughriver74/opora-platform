from json import loads
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, UploadFile, File, Form

from app.models import User
from app.schemas.tasks_schema import DealSchema, TaskSchema
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter()


@router.post(
    "/create_sales_task", summary="Постановка задачи с возможностью прикрепить файл"
)
async def create_sales_task(
    title: str = Form(...),
    description: str = Form(...),
    responsible_id: int = Form(...),
    visit_id: Optional[int] = Form(None),
    company_bitrix_id: int = Form(...),
    observer_ids: Optional[str] = Form(None),
    deadline: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    files: List[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):

    observer_ids_list = loads(observer_ids) if observer_ids else None

    data = TaskSchema(
        title=title,
        description=description,
        responsible_id=responsible_id,
        observer_ids=observer_ids_list,
        visit_id=visit_id if visit_id else None,
        company_bitrix_id=company_bitrix_id,
        deadline=deadline,
        tags=tags,
    )

    return await uow.tasks.create_sales_task(
        current_user=current_user, data=data, files=files
    )


@router.post("/create_sales_task_v2", summary="Постановка задачи без файла")
async def create_sales_task(
    title: str = Form(...),
    description: str = Form(...),
    responsible_id: int = Form(...),
    visit_id: Optional[int] = Form(None),
    company_bitrix_id: int = Form(...),
    observer_ids: Optional[str] = Form(None),
    deadline: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):

    observer_ids_list = loads(observer_ids) if observer_ids else None

    data = TaskSchema(
        title=title,
        description=description,
        responsible_id=responsible_id,
        observer_ids=observer_ids_list,
        visit_id=visit_id if visit_id else None,
        company_bitrix_id=company_bitrix_id,
        deadline=deadline,
        tags=tags,
    )

    return await uow.tasks.create_sales_task(
        current_user=current_user, data=data, files=None
    )


@router.post("/create_equipment_deal")
async def create_equipment_deal(
    data: DealSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user),
):
    return await uow.tasks.create_equipment_deal(current_user=current_user, data=data)


@router.get("/get_bitrix_manager")
async def get_bitrix_manager(
    search: str = None,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user),
):
    return await uow.tasks.get_bitrix_manager(search=search)
