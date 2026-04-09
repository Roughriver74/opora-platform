from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, Query, status

from app.schemas.contact_schema import ContactCreate, ContactResponseBase, ContactUpdate
from app.services.uow import UnitOfWork, get_uow
from app.utils.utils import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ContactResponseBase])
async def get_contacts(
    uow: UnitOfWork = Depends(get_uow), current_user=Depends(get_current_user)
):
    """Get all contacts (LPRs)."""
    return await uow.contact.get_contacts()


@router.get("/company/{company_id}", response_model=List[Dict[str, Any]])
async def get_company_contacts(
    company_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get contacts associated with a specific company from Bitrix24."""
    return await uow.contact.get_company_contacts(company_id=company_id)


@router.get("/search", status_code=status.HTTP_200_OK)
async def search_contacts(
    term: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Search contacts by name or other criteria in Bitrix24."""
    return await uow.contact.search_contacts(term=term)


@router.get("/bitrix/{contact_id}", status_code=status.HTTP_200_OK)
async def get_contact_by_bitrix_id(
    contact_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Get contact data from Bitrix24 by ID."""
    return await uow.contact.get_contact_by_bitrix_id(contact_id=contact_id)


@router.get("/{contact_id}", response_model=ContactResponseBase)
async def get_contact(
    contact_id: int,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
    sync_with_bitrix: bool = Query(
        False, description="Синхронизировать данные с Bitrix24"
    ),
):
    """Get a specific contact with optional Bitrix24 synchronization."""
    return await uow.contact.get_contact(
        contact_id=contact_id, sync_with_bitrix=sync_with_bitrix
    )


@router.post("/", response_model=ContactResponseBase)
async def create_contact(
    contact: ContactCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Create a new contact and sync with Bitrix24."""
    return await uow.contact.create_contact(contact=contact)


@router.put("/{contact_id}", response_model=ContactResponseBase)
async def update_contact(
    contact_id: int,
    contact: ContactUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """Update a contact and sync changes with Bitrix24."""
    return await uow.contact.update_contact(contact_id=contact_id, contact=contact)


@router.post("/bitrix/update", status_code=status.HTTP_200_OK)
async def update_contact_in_bitrix(
    data: Dict[str, Any] = Body(...),
    uow: UnitOfWork = Depends(get_uow),
    current_user=Depends(get_current_user),
):
    """
    Обновляет данные контакта напрямую в Bitrix24 без сохранения в локальной базе данных.
    Принимает данные в формате Bitrix24 API.
    """
    return await uow.contact.update_contact_in_bitrix(data=data)


@router.post("/sync", response_model=List[ContactResponseBase])
async def sync_contacts_from_bitrix(
    uow: UnitOfWork = Depends(get_uow), current_user=Depends(get_current_user)
):
    """Sync contacts from Bitrix24 to local database."""
    return await uow.contact.sync_contacts_from_bitrix()
