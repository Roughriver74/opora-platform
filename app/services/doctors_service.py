from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy import func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.emuns.clinic_enum import SyncStatus
from app.models import Doctor
from app.schemas.contact_schema import DoctorBitrixSchema
from app.services.bitrix24 import Bitrix24Client, require_bitrix24
from app.utils.logger import logger


class DoctorService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    def _require_bitrix(self) -> Bitrix24Client:
        return require_bitrix24(self.bitrix24)

    # ── Local DB operations ──────────────────────────────────────────

    @logger()
    async def get_doctors_paginated(
        self,
        current_user=None,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ):
        query = select(Doctor)
        count_query = select(sa_func.count(Doctor.id))

        if current_user and not current_user.is_platform_admin:
            query = query.where(Doctor.organization_id == current_user.organization_id)
            count_query = count_query.where(
                Doctor.organization_id == current_user.organization_id
            )

        if search:
            search_filter = Doctor.name.ilike(f"%{search}%")
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        total = await self.session.scalar(count_query)
        total_pages = ceil(total / page_size) if total else 0

        query = query.order_by(Doctor.id.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        doctors = (await self.session.execute(query)).scalars().all()

        return {
            "items": doctors,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    @logger()
    async def get_doctor(self, doctor_id: int, current_user=None) -> Doctor:
        query = select(Doctor).where(Doctor.id == doctor_id)
        if current_user and not current_user.is_platform_admin:
            query = query.where(Doctor.organization_id == current_user.organization_id)
        result = await self.session.execute(query)
        doctor = result.scalars().first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        return doctor

    @logger()
    async def create_doctor_local(self, data: dict, current_user=None) -> Doctor:
        doctor = Doctor(
            name=data.get("name", ""),
            dynamic_fields=data.get("dynamic_fields", {}),
            bitrix_id=data.get("bitrix_id"),
            sync_status=SyncStatus.PENDING.value,
            organization_id=current_user.organization_id if current_user else None,
        )
        self.session.add(doctor)
        await self.session.commit()
        await self.session.refresh(doctor)
        return doctor

    @logger()
    async def update_doctor_local(
        self, doctor_id: int, data: dict, current_user=None
    ) -> Doctor:
        doctor = await self.get_doctor(doctor_id, current_user=current_user)

        if "name" in data and data["name"] is not None:
            doctor.name = data["name"]

        if "dynamic_fields" in data and data["dynamic_fields"] is not None:
            if doctor.dynamic_fields:
                updated = dict(doctor.dynamic_fields)
                updated.update(data["dynamic_fields"])
                doctor.dynamic_fields = updated
            else:
                doctor.dynamic_fields = data["dynamic_fields"]

        doctor.sync_status = SyncStatus.PENDING.value

        await self.session.commit()
        await self.session.refresh(doctor)
        return doctor

    # ── Bitrix operations (existing) ─────────────────────────────────

    @logger()
    async def get_doctors_from_bitrix(self, company_id: int):
        self._require_bitrix()
        return await self.bitrix24.get_doctors(company_id=company_id)

    @logger()
    async def create_doctor_bitrix(self, data: DoctorBitrixSchema):
        self._require_bitrix()
        return await self.bitrix24.create_contact(
            fields=data.model_dump(exclude_unset=True, exclude_none=True)
        )

    @logger()
    async def delete_doctor_bitrix(self, doctor_bitrix_id: int):
        self._require_bitrix()
        return await self.bitrix24.delete_contact(doctor_bitrix_id=doctor_bitrix_id)

    @logger()
    async def sync_doctors_from_bitrix(self, current_user=None):
        """Sync all contacts with TYPE_ID matching doctor types from Bitrix24."""
        self._require_bitrix()
        import logging
        log = logging.getLogger(__name__)

        organization_id = current_user.organization_id if current_user else None
        contacts = await self.bitrix24.get_contacts()
        synced = []

        for contact in contacts:
            try:
                bitrix_id = int(contact.get("ID", 0))
                if not bitrix_id:
                    continue

                name = f"{contact.get('NAME', '')} {contact.get('LAST_NAME', '')}".strip()
                if not name:
                    continue

                # Check if doctor exists locally
                db_doctor = (
                    await self.session.execute(
                        select(Doctor).where(Doctor.bitrix_id == bitrix_id)
                    )
                ).scalars().first()

                dynamic_fields = {}
                for key, value in contact.items():
                    if key.startswith("UF_") and value:
                        dynamic_fields[key.lower()] = value

                if db_doctor:
                    db_doctor.name = name
                    existing = db_doctor.dynamic_fields or {}
                    existing.update(dynamic_fields)
                    db_doctor.dynamic_fields = existing
                    db_doctor.sync_status = SyncStatus.SYNCED.value
                    db_doctor.sync_error = None
                    db_doctor.last_synced = datetime.now()
                else:
                    db_doctor = Doctor(
                        bitrix_id=bitrix_id,
                        name=name,
                        dynamic_fields=dynamic_fields,
                        sync_status=SyncStatus.SYNCED.value,
                        last_synced=datetime.now(),
                        organization_id=organization_id,
                    )
                    self.session.add(db_doctor)

                synced.append(db_doctor)
            except Exception as e:
                log.error("Error syncing doctor %s: %s", contact.get("ID", "?"), str(e))
                continue

        await self.session.commit()
        return synced
