from typing import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.database_session import SessionLocal
from app.services.admin_service import AdminQuery
from app.services.auth_service import AuthService
from app.services.bitrix24 import Bitrix24Client, get_bitrix_client
from app.services.clinic_service import ClinicService
from app.services.contact_service import ContactService
from app.services.custom_section_service import CustomSectionService
from app.services.dadata_service import DaDataService
from app.services.doctors_service import DoctorService
from app.services.network_clinic_service import NetWorkClinicService
from app.services.settings_service import SettingsService
from app.services.tasks_service import TasksService
from app.services.users_service import UsersService
from app.services.visit_service import VisitService


class UnitOfWork:
    def __init__(
        self,
        session_factory: async_sessionmaker,
        bitrix24: Bitrix24Client,
    ):
        self.session_factory = session_factory
        self.session: AsyncSession | None = None
        self.admin = AdminQuery
        self.clinic = ClinicService
        self.visit = VisitService
        self.bitrix24 = bitrix24
        self.contact = ContactService
        self.doctor = DoctorService
        self.settings = SettingsService
        self.users = UsersService
        self.custom_section = CustomSectionService
        self.network_clinic = NetWorkClinicService
        self.auth = AuthService
        self.dadata = DaDataService
        self.tasks = TasksService

    async def __aenter__(self):
        self.session = self.session_factory()
        self.admin = AdminQuery(self.session, self.bitrix24)
        self.clinic = ClinicService(self.session, self.bitrix24)
        self.visit = VisitService(self.session, self.bitrix24)
        self.contact = ContactService(self.session, self.bitrix24)
        self.doctor = DoctorService(self.session, self.bitrix24)
        self.settings = SettingsService(self.session)
        self.users = UsersService(self.session, self.bitrix24)
        self.custom_section = CustomSectionService(self.session)
        self.network_clinic = NetWorkClinicService(self.session, self.bitrix24)
        self.auth = AuthService(self.session, self.bitrix24)
        self.dadata = DaDataService(self.session)
        self.tasks = TasksService(self.bitrix24, self.session)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.session.rollback()
        await self.session.close()

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()


async def get_uow(
    bitrix24: Bitrix24Client = Depends(get_bitrix_client),
) -> AsyncGenerator[UnitOfWork, None]:
    async with UnitOfWork(SessionLocal, bitrix24=bitrix24) as uow:
        yield uow
