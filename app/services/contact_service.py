from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.config import BITRIX_FIELDS_MAP
from app.emuns.clinic_enum import SyncStatus
from app.models import Company, Contact, company_contacts
from app.schemas.contact_schema import ContactUpdate
from app.services.bitrix24 import Bitrix24Client, require_bitrix24
from app.utils.logger import logger


class ContactService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    def _require_bitrix(self) -> Bitrix24Client:
        return require_bitrix24(self.bitrix24)

    @logger()
    async def get_contacts(self, current_user=None) -> Sequence[Contact]:
        query = select(Contact)
        if current_user and not current_user.is_platform_admin:
            query = query.where(Contact.organization_id == current_user.organization_id)
        return (await self.session.execute(query)).scalars().all()

    @logger()
    async def get_company_contacts(
        self, company_id: int
    ) -> list[dict[str, int | str | Any]]:
        company = (
            (
                await self.session.execute(
                    select(Company).where(Company.id == company_id)
                )
            )
            .scalars()
            .first()
        )

        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Company with ID {company_id} not found",
            )
        if company.bitrix_id and self.bitrix24 is not None:
            bitrix_contacts = await self.get_company_contacts_from_bitrix(
                company.bitrix_id
            )
            if bitrix_contacts:
                return bitrix_contacts
        # Fallback to local contacts (also used when Bitrix24 is not configured)
        local_contacts = (
            (
                await self.session.execute(
                    select(Contact)
                    .join(company_contacts)
                    .where(company_contacts.c.company_id == company_id)
                )
            )
            .scalars()
            .all()
        )

        formatted_contacts = [
            {
                "id": contact.id,
                "bitrix_id": contact.bitrix_id,
                "name": contact.name,
                "position": (
                    contact.dynamic_fields.get("position", "")
                    if contact.dynamic_fields
                    else ""
                ),
                "email": (
                    contact.dynamic_fields.get("email", "")
                    if contact.dynamic_fields
                    else ""
                ),
                "phone": (
                    contact.dynamic_fields.get("phone", "")
                    if contact.dynamic_fields
                    else ""
                ),
                "company_id": company_id,
            }
            for contact in local_contacts
        ]

        return formatted_contacts

    @logger()
    async def search_contacts(self, term: str) -> dict[str, list[dict]]:
        if self.bitrix24 is None:
            # Bitrix24 not configured -- search locally
            query = select(Contact).where(Contact.name.ilike(f"%{term}%"))
            results = (await self.session.execute(query)).scalars().all()
            return {
                "contacts": [
                    {
                        "id": c.id,
                        "name": c.name,
                        "contact_type": c.contact_type,
                    }
                    for c in results
                ]
            }
        try:
            contacts = await self.bitrix24.search_contacts_by_name(term)
            return {"contacts": contacts}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error searching contacts: {str(e)}",
            )

    @logger()
    async def get_contact_by_bitrix_id(self, contact_id: int):
        self._require_bitrix()
        contact = await self.bitrix24.get_contact(contact_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Contact with ID {contact_id} not found in Bitrix24",
            )
        return contact

    @logger()
    async def get_contact(self, contact_id: int, sync_with_bitrix: bool, current_user=None) -> Contact:
        """
        Получает контакт по ID и при необходимости синхронизирует его с Bitrix.
        """
        contact = await self._fetch_contact(contact_id, current_user=current_user)
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        if sync_with_bitrix and contact.bitrix_id:
            await self._sync_contact_with_bitrix(contact)

        return contact

    @logger()
    async def _fetch_contact(self, contact_id: int, current_user=None) -> Optional[Contact]:
        """
        Получает контакт из базы данных.
        """
        query = select(Contact).where(Contact.id == contact_id)
        if current_user and not current_user.is_platform_admin:
            query = query.where(Contact.organization_id == current_user.organization_id)
        result = await self.session.execute(query)
        return result.scalars().first()

    @logger()
    async def _sync_contact_with_bitrix(self, contact: Contact) -> None:
        """
        Синхронизирует контакт с данными из Bitrix.
        """
        if self.bitrix24 is None:
            return
        try:
            bitrix_contact = await self.bitrix24.get_contact(contact.bitrix_id)
            if bitrix_contact:
                await self._update_contact_from_bitrix(contact, bitrix_contact)
                contact.sync_status = SyncStatus.SYNCED.value
                contact.last_synced = datetime.now()
        except Exception as e:
            contact.sync_status = SyncStatus.ERROR.value
            contact.error_message = str(e)  # Добавляем сообщение об ошибке
        finally:
            await self.session.commit()
            await self.session.refresh(contact)

    @staticmethod
    @logger()
    async def _update_contact_from_bitrix(
        contact: Contact, bitrix_contact: Dict[str, str]
    ) -> None:
        """
        Обновляет данные контакта на основе данных из Bitrix.
        """
        contact.name = f"{bitrix_contact.get('NAME', '')} {bitrix_contact.get('LAST_NAME', '')}".strip()

        dynamic_fields = {}
        for bitrix_key, field_name in BITRIX_FIELDS_MAP.items():
            if bitrix_key in bitrix_contact:
                dynamic_fields[field_name] = bitrix_contact[bitrix_key]

        # Обработка пользовательских полей (UF_*)
        for key, value in bitrix_contact.items():
            if key.startswith("UF_") and value:
                dynamic_fields[key.lower()] = value

        contact.dynamic_fields = dynamic_fields

    @logger()
    async def create_contact(self, contact, current_user=None):
        db_contact = Contact(
            name=contact.name,
            contact_type=contact.contact_type,
            dynamic_fields=contact.dynamic_fields or {},
            bitrix_id=contact.bitrix_id,
            sync_status=SyncStatus.PENDING.value,
            organization_id=current_user.organization_id if current_user else None,
        )

        self.session.add(db_contact)
        await self.session.commit()
        await self.session.refresh(db_contact)

        if not contact.bitrix_id and self.bitrix24 is not None:
            try:
                bitrix_fields = {
                    "NAME": (
                        contact.name.split(" ")[0]
                        if " " in contact.name
                        else contact.name
                    ),
                    "LAST_NAME": (
                        " ".join(contact.name.split(" ")[1:])
                        if " " in contact.name
                        else ""
                    ),
                    "TYPE_ID": contact.contact_type or "LPR",
                }

                if contact.dynamic_fields:
                    for field_name, value in contact.dynamic_fields.items():
                        if not field_name.startswith("uf_crm_"):
                            bitrix_field_name = f"UF_CRM_{field_name.upper()}"
                        else:
                            bitrix_field_name = field_name.upper()
                        bitrix_fields[bitrix_field_name] = value

                bitrix_result = await self.bitrix24.create_contact(bitrix_fields)

                if bitrix_result:
                    db_contact.bitrix_id = int(bitrix_result)
                    db_contact.sync_status = SyncStatus.SYNCED.value
                    db_contact.last_synced = datetime.now()
                    await self.session.commit()
                    await self.session.refresh(db_contact)
                else:
                    db_contact.sync_status = SyncStatus.ERROR.value
                    await self.session.commit()

            except Exception as e:
                db_contact.sync_status = SyncStatus.ERROR.value
                await self.session.commit()

        return db_contact

    @logger()
    async def update_contact(self, contact_id: int, contact: ContactUpdate):
        db_contact = await self._fetch_contact(contact_id=contact_id)
        if not db_contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        if contact.name is not None:
            db_contact.name = contact.name

        if contact.contact_type is not None:
            db_contact.contact_type = contact.contact_type

        if contact.dynamic_fields is not None:
            if db_contact.dynamic_fields:
                updated_fields = dict(db_contact.dynamic_fields)
                updated_fields.update(contact.dynamic_fields)
                db_contact.dynamic_fields = updated_fields
            else:
                db_contact.dynamic_fields = contact.dynamic_fields

        db_contact.sync_status = SyncStatus.PENDING.value

        await self.session.commit()
        await self.session.refresh(db_contact)

        if db_contact.bitrix_id and self.bitrix24 is not None:
            try:
                bitrix_fields = {}
                if contact.name is not None:
                    name_parts = contact.name.split(" ", 1)
                    bitrix_fields["NAME"] = name_parts[0]
                    if len(name_parts) > 1:
                        bitrix_fields["LAST_NAME"] = name_parts[1]

                if contact.contact_type is not None:
                    bitrix_fields["TYPE_ID"] = contact.contact_type

                dynamic_fields = {}
                if contact.dynamic_fields:
                    for field_name, value in contact.dynamic_fields.items():
                        if field_name.startswith("UF_CRM_"):
                            local_field_name = field_name[7:].lower()
                        else:
                            local_field_name = field_name.lower()
                        dynamic_fields[local_field_name] = value

                success = await self.bitrix24.update_contact(
                    db_contact.bitrix_id, bitrix_fields, dynamic_fields
                )

                if success:
                    db_contact.sync_status = SyncStatus.SYNCED.value
                    db_contact.last_synced = datetime.now()
                else:
                    db_contact.sync_status = SyncStatus.ERROR.value

                await self.session.commit()
                await self.session.refresh(db_contact)

            except Exception as e:
                db_contact.sync_status = SyncStatus.ERROR.value
                await self.session.commit()
                await self.session.refresh(db_contact)

        return db_contact

    @logger()
    async def update_contact_in_bitrix(self, data: dict):
        self._require_bitrix()
        if "id" not in data or "fields" not in data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: id and fields",
            )
        contact_id = int(data["id"])
        db_contact = await self._fetch_contact(contact_id=contact_id)

        result = await self.bitrix24.update_contact(contact_id, data["fields"])

        if result and db_contact:
            db_contact.sync_status = SyncStatus.SYNCED.value
            db_contact.last_synced = datetime.now()
            await self.session.commit()
        return {"success": result}

    @logger()
    async def sync_contacts_from_bitrix(self, current_user=None):
        self._require_bitrix()
        bitrix_contacts = await self.bitrix24.get_contacts()
        updated_contacts = []

        for bitrix_contact in bitrix_contacts:
            try:
                bitrix_id = int(bitrix_contact.get("ID"))
                db_contact = (
                    (
                        await self.session.execute(
                            select(Contact).where(Contact.bitrix_id == bitrix_id)
                        )
                    )
                    .scalars()
                    .first()
                )

                name = f"{bitrix_contact.get('NAME', '')} {bitrix_contact.get('LAST_NAME', '')}".strip()
                dynamic_fields = {}

                if bitrix_contact.get("TYPE_ID"):
                    dynamic_fields["contact_type"] = bitrix_contact.get("TYPE_ID")
                if bitrix_contact.get("EMAIL"):
                    dynamic_fields["email"] = bitrix_contact.get("EMAIL")
                if bitrix_contact.get("PHONE"):
                    dynamic_fields["phone"] = bitrix_contact.get("PHONE")

                for key, value in bitrix_contact.items():
                    if key.startswith("UF_") and value:
                        field_name = key.lower()
                        dynamic_fields[field_name] = value

                if db_contact:
                    db_contact.name = name
                    db_contact.dynamic_fields = dynamic_fields
                    db_contact.sync_status = SyncStatus.SYNCED.value
                    db_contact.last_synced = datetime.now()
                else:
                    db_contact = Contact(
                        bitrix_id=bitrix_id,
                        name=name,
                        contact_type=bitrix_contact.get("TYPE_ID", "LPR"),
                        dynamic_fields=dynamic_fields,
                        sync_status=SyncStatus.SYNCED.value,
                        last_synced=datetime.now(),
                        organization_id=current_user.organization_id if current_user else None,
                    )
                    self.session.add(db_contact)

                await self.session.commit()
                await self.session.refresh(db_contact)
                updated_contacts.append(db_contact)

            except Exception:
                await self.session.rollback()
        return updated_contacts

    @logger()
    async def get_company_contacts_from_bitrix(self, company_id: int) -> List[Dict]:
        """
        Получение контактов, связанных с компанией в Bitrix24
        """
        if self.bitrix24 is None:
            return []
        try:
            params = {
                "filter": {"COMPANY_ID": company_id},
                "select": [
                    "ID",
                    "NAME",
                    "LAST_NAME",
                    "SECOND_NAME",
                    "EMAIL",
                    "PHONE",
                    "POST",
                    "COMPANY_ID",
                ],
            }

            result = await self.bitrix24.make_request_async("crm.contact.list", params)

            if not result or "result" not in result:
                return []

            contacts = result["result"]
            formatted_contacts = []
            for contact in contacts:
                full_name = (
                    f"{contact.get('NAME', '')} {contact.get('LAST_NAME', '')}".strip()
                )
                email = (
                    contact.get("EMAIL", [{}])[0].get("VALUE", "")
                    if contact.get("EMAIL")
                    else ""
                )
                phone = (
                    contact.get("PHONE", [{}])[0].get("VALUE", "")
                    if contact.get("PHONE")
                    else ""
                )

                formatted_contact = {
                    "bitrix_id": contact["ID"],
                    "name": full_name,
                    "position": contact.get("POST", ""),
                    "email": email,
                    "phone": phone,
                    "company_id": contact.get("COMPANY_ID", ""),
                }
                formatted_contacts.append(formatted_contact)

            return formatted_contacts

        except Exception:
            return []
