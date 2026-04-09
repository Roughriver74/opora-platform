import json
from datetime import datetime

from fastapi import HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import asc, delete, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.config import NETWORK_CLINIC_PROCESS_ID
from app.emuns.clinic_enum import SyncStatus
from app.emuns.visit_enum import EntityType
from app.models import Company, FieldMapping, NetworkClinic, User
from app.schemas.network_clinic_schema import (
    CreateNetworkClinicSchema,
    ResponseNetworkClinicSchema,
)
from app.services.bitrix24 import Bitrix24Client
from app.utils.logger import logger


class NetWorkClinicService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    @logger()
    async def get_network_clinics(self):
        return (await self.session.execute(select(NetworkClinic))).scalars().all()

    @logger()
    async def get_network_clinic(self, bitrix_id):
        return (
            (
                await self.session.execute(
                    select(NetworkClinic).where(NetworkClinic.bitrix_id == bitrix_id)
                )
            )
            .scalars()
            .first()
        )

    @logger()
    async def get_clinic_bitrix_id(self, company_id):
        return (
            (
                await self.session.execute(
                    select(Company).where(Company.id == company_id)
                )
            )
            .scalars()
            .first()
        )

    @logger()
    async def prepare_data_for_bitrix_update(
        self, network_clinic: CreateNetworkClinicSchema, bitrix_user_id: int
    ):
        """Синхронизирует данные визита с Bitrix24."""
        bitrix_company_id = (
            (
                await self.session.execute(
                    select(Company.bitrix_id).where(
                        Company.id == network_clinic.company_id
                    )
                )
            )
            .scalars()
            .first()
        )

        bitrix_data = {
            "TITLE": f"{network_clinic.name}",
            "COMPANY_ID": bitrix_company_id,
            "ASSIGNED_BY_ID": bitrix_user_id,
        }

        if hasattr(network_clinic, "dynamic_fields") and network_clinic.dynamic_fields:
            for field_key, field_value in network_clinic.dynamic_fields.items():
                bitrix_data[field_key] = field_value

        return bitrix_data

    @logger()
    async def create_network_clinic(
        self, data: CreateNetworkClinicSchema, current_user=None
    ):
        clinic_data = data.model_dump(exclude_none=True)
        if current_user:
            fields = await self.prepare_data_for_bitrix_update(
                network_clinic=data, bitrix_user_id=current_user.bitrix_user_id
            )
            result = await self.bitrix24.create_smart_process_item(
                process_id=NETWORK_CLINIC_PROCESS_ID, fields=fields
            )
            clinic_data["bitrix_id"] = result.get("item").get("id")

        new_network_clinic = NetworkClinic(**clinic_data)
        self.session.add(new_network_clinic)
        if clinic_data.get("company_id"):
            clinic = (
                (
                    await self.session.execute(
                        select(Company).where(
                            Company.id == clinic_data.get("company_id")
                        )
                    )
                )
                .scalars()
                .first()
            )
            clinic.is_network = True
        await self.session.commit()
        await self.session.refresh(new_network_clinic)

        return new_network_clinic

    @logger()
    async def update_network_clinic(
        self, data: CreateNetworkClinicSchema, bitrix_id, bitrix_user_id=None
    ):
        exist_clinic = await self.get_network_clinic(bitrix_id)
        if not exist_clinic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Клиники не существует."
            )

        update_data = data.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        await self.session.execute(
            update(NetworkClinic)
            .where(NetworkClinic.bitrix_id == bitrix_id)
            .values(**update_data)
        )
        await self.session.commit()
        if bitrix_user_id:
            fields = await self.prepare_data_for_bitrix_update(
                network_clinic=data, bitrix_user_id=bitrix_user_id
            )
            await self.bitrix24.update_smart_process_item(
                process_id=NETWORK_CLINIC_PROCESS_ID,
                item_id=bitrix_id,
                fields=fields,
            )
        return JSONResponse(
            status_code=status.HTTP_201_CREATED, content="Данные клиники обновлены."
        )

    @logger()
    async def delete_network_clinic(self, bitrix_id):
        await self.session.execute(
            delete(NetworkClinic).where(NetworkClinic.bitrix_id == bitrix_id)
        )
        await self.session.commit()

    @logger()
    async def get_network_clinics_by_clinic_id(
        self,
        clinic_id: int,
        page: int,
        page_size: int,
        sort_by: str,
        sort_direction: str,
    ):
        sort_func = asc if sort_direction.lower() == "asc" else desc

        query = (
            select(NetworkClinic)
            .where(NetworkClinic.company_id == clinic_id)
            .order_by(sort_func(getattr(NetworkClinic, sort_by)))
        )

        offset = (page - 1) * page_size

        clinics = (
            (await self.session.execute(query.offset(offset).limit(page_size)))
            .scalars()
            .all()
        )
        total = await self.session.execute(
            select(func.count()).where(NetworkClinic.company_id == clinic_id)
        )

        return [
            ResponseNetworkClinicSchema.model_validate(clinic.__dict__)
            for clinic in clinics
        ], total.scalar_one()

    @logger()
    async def clinic_update_network_clinic(self):
        """
        Обновляет поле is_network для всех компаний на основе наличия связанных записей в network_clinic.
        """
        result = await self.session.execute(
            select(Company, NetworkClinic).outerjoin(
                NetworkClinic, Company.id == NetworkClinic.company_id
            )
        )

        companies_data = {}
        for company, network_clinic in result:
            if company.id not in companies_data:
                companies_data[company.id] = {
                    "company": company,
                    "has_network": False,
                }
            if network_clinic:
                companies_data[company.id]["has_network"] = True

        for data in companies_data.values():
            company = data["company"]
            company.is_network = data["has_network"]
            self.session.add(company)

        await self.session.commit()

        return JSONResponse(
            status_code=status.HTTP_200_OK, content="Данные клиники обновлены."
        )

    @logger()
    async def to_bitrix_sync_network_clinics(
        self, current_user: User
    ):  # TODO Я вот пока не понимаю как это работает, после обновления клник из битрикса надо посмотреть
        clinics = await self.get_network_clinics()
        for clinic in clinics:
            fields = {
                "ASSIGNED_BY_ID": current_user.bitrix_user_id,
                "TITLE": clinic.name,
                "COMPANY_ID": clinic.company_id,
                "createdTime": clinic.created_at.isoformat(),
                "updatedTime": clinic.updated_at.isoformat(),
                "lastActivityTime": (
                    clinic.last_synced.isoformat() if clinic.last_synced else None
                ),
                **clinic.dynamic_fields,
            }
            bitrix_clinic = await self.bitrix24.get_smart_process_item(
                process_id=NETWORK_CLINIC_PROCESS_ID, item_id=clinic.bitrix_id
            )
            if bitrix_clinic:
                await self.bitrix24.update_smart_process_item(
                    process_id=NETWORK_CLINIC_PROCESS_ID,
                    item_id=clinic.bitrix_id,
                    fields=fields,
                )
            else:
                await self.bitrix24.create_smart_process_item(
                    process_id=NETWORK_CLINIC_PROCESS_ID, fields=fields
                )
        return JSONResponse(
            status_code=status.HTTP_200_OK, content="Данные клиники обновлены."
        )

    @logger()
    async def from_bitrix_sync_network_clinics(self):
        network_clinics = await self.bitrix24.get_smart_process_items(
            process_id=NETWORK_CLINIC_PROCESS_ID
        )
        for network_clinic in network_clinics:
            single_clinic = await self.get_network_clinic(
                bitrix_id=network_clinic.get("id")
            )
            data = CreateNetworkClinicSchema(
                bitrix_id=network_clinic.get("id"),
                dynamic_fields=network_clinic,
                sync_status=SyncStatus.SYNCED.value,
                name=network_clinic.get("title"),
                company_id=network_clinic.get("companyId"),
            )
            if single_clinic:
                await self.update_network_clinic(
                    data=data, bitrix_id=network_clinic.get("id")
                )
            else:
                await self.create_network_clinic(data=data)

        return JSONResponse(
            status_code=status.HTTP_200_OK, content="Данные клиник обновлены."
        )

    @logger()
    async def get_doctor(self, company_id: int):
        doctor_bitrix_ids = (
            await self.session.execute(
                select(NetworkClinic.doctor_bitrix_id).where(
                    NetworkClinic.bitrix_id == company_id
                )
            )
        ).scalar()
        if doctor_bitrix_ids:
            doctor_bitrix_data_list = []
            for doctor_bitrix_id in doctor_bitrix_ids:
                doctor_data = await self.bitrix24.get_contact(
                    contact_id=doctor_bitrix_id
                )
                doctor_bitrix_data_list.append(doctor_data)
            return doctor_bitrix_data_list
        else:
            return
