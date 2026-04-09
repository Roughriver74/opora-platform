from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.contact_schema import DoctorBitrixSchema
from app.services.bitrix24 import Bitrix24Client
from app.utils.logger import logger


class DoctorService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    @logger()
    async def get_doctors_from_bitrix(self, company_id: int):
        return await self.bitrix24.get_doctors(company_id=company_id)

    @logger()
    async def create_doctor_bitrix(self, data: DoctorBitrixSchema):
        return await self.bitrix24.create_contact(
            fields=data.model_dump(exclude_unset=True, exclude_none=True)
        )

    @logger()
    async def delete_doctor_bitrix(self, doctor_bitrix_id: int):
        return await self.bitrix24.delete_contact(doctor_bitrix_id=doctor_bitrix_id)
