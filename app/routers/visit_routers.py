from typing import List

from fastapi import APIRouter, Depends, Request
from starlette import status

from app.schemas.visit_schema import (
    StatusUpdate,
    VisitCreate,
    VisitDeleteSchema,
    VisitResponseBase,
)
from app.services.uow import UnitOfWork, get_uow
from app.utils.logger import logger
from app.utils.utils import get_current_admin_user, get_current_user

router = APIRouter()


@router.get("/", response_model=List[VisitResponseBase])
async def get_visits(
    uow: UnitOfWork = Depends(get_uow), current_user=Depends(get_current_user)
):
    """Get all visits for the current user."""
    return await uow.visit.get_visits(current_user=current_user)


@router.get("/company/{company_id}", response_model=List[VisitResponseBase])
async def get_visits_by_company(
    company_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get all visits for a specific company regardless of which user created them."""
    return await uow.visit.get_visits_by_company(company_id=company_id, current_user=current_user)


@router.put("/{visit_id}/status", response_model=VisitResponseBase)
async def update_visit_status(
    visit_id: int,
    status_update: StatusUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Update a visit status and sync with Bitrix24."""
    return await uow.visit.update_visit_status(
        visit_id=visit_id, status_update=status_update, current_user=current_user
    )


@router.get("/{visit_id}", response_model=VisitResponseBase)
async def get_visit(
    visit_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get a specific visit."""
    return await uow.visit.get_visit(
        visit_id=visit_id, current_user=current_user, join_options=True
    )


@router.post("/", response_model=VisitResponseBase)
async def create_visit(
    visit: VisitCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Create a new visit and sync with Bitrix24."""
    return await uow.visit.create_visit(visit=visit, current_user=current_user)


@router.post("/{visit_id}", response_model=VisitResponseBase)
async def update_visit(
    visit_id: int,
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    return await uow.visit.update_visit(
        visit_id=visit_id, current_user=current_user, request=request
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visit(
    data: VisitDeleteSchema,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_admin_user),
):
    await uow.visit.delete_visit(data=data, current_user=current_user)
