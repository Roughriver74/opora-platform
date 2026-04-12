"""Pytest конфигурация и фикстуры для OPORA тестов.

Особенности реальной архитектуры:
- DI точка входа: get_uow (UnitOfWork), а не get_async_session напрямую
- Модели используют JSONB и ARRAY — несовместимо с SQLite
  => используем PostgreSQL тестовую БД через asyncpg
- Для запуска нужна переменная TEST_DATABASE_URL (или .env.test)
- UoW создаёт сессию из SessionLocal factory => переопределяем get_uow целиком
"""
import asyncio
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.models import Base, Organization, User
from app.services.uow import UnitOfWork, get_uow

# ─── Test Database URL ──────────────────────────────────────────────────────
# Используем отдельную тестовую PostgreSQL БД.
# По умолчанию берём из переменной окружения TEST_DATABASE_URL.
# Для CI можно выставить: postgresql+asyncpg://user:pass@localhost:5432/opora_test
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://opora_user:opora_dev_pass@localhost:4202/opora_test",
)


# ─── Event loop ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Единый event loop для всей сессии тестов."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ─── Engine & schema ────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """Создаёт тестовый PostgreSQL engine и схему БД один раз на сессию."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


# ─── Session per test ────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    """Тестовая сессия БД с откатом после каждого теста."""
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


# ─── UoW override ────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    """HTTP тест-клиент с подменённым UnitOfWork (использует тестовую сессию).

    Переопределяем get_uow: создаём UoW с session_factory, которая всегда
    возвращает одну и ту же тестовую сессию. Bitrix24 = None (отключён).
    """
    # session_factory-заглушка: возвращает уже открытую сессию
    def make_session_factory(session: AsyncSession):
        def factory():
            return session
        return factory

    async def override_get_uow():
        uow = UnitOfWork.__new__(UnitOfWork)
        # Инициализируем вручную — обходим реальный конструктор,
        # чтобы не трогать production SessionLocal
        uow.session_factory = make_session_factory(db_session)
        uow.bitrix24 = None

        # Импортируем сервисы и инициализируем так же как __aenter__
        from app.services.admin_service import AdminQuery
        from app.services.auth_service import AuthService
        from app.services.clinic_service import ClinicService
        from app.services.contact_service import ContactService
        from app.services.custom_section_service import CustomSectionService
        from app.services.dadata_service import DaDataService
        from app.services.network_clinic_service import NetWorkClinicService
        from app.services.settings_service import SettingsService
        from app.services.tasks_service import TasksService
        from app.services.users_service import UsersService
        from app.services.visit_service import VisitService

        uow.session = db_session
        uow.admin = AdminQuery(db_session, None)
        uow.clinic = ClinicService(db_session, None)
        uow.visit = VisitService(db_session, None)
        uow.contact = ContactService(db_session, None)
        uow.settings = SettingsService(db_session)
        uow.users = UsersService(db_session, None)
        uow.custom_section = CustomSectionService(db_session)
        uow.network_clinic = NetWorkClinicService(db_session, None)
        uow.auth = AuthService(db_session, None)
        uow.dadata = DaDataService(db_session)
        uow.tasks = TasksService(None, db_session)

        yield uow

    app.dependency_overrides[get_uow] = override_get_uow

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ─── Helper fixtures ──────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_org(db_session: AsyncSession) -> Organization:
    """Тестовая организация с планом free."""
    org = Organization(
        name="Test Org",
        slug="test-org",
        plan="free",
        plan_limits={"max_users": 5, "max_visits_per_month": 100},
        is_active=True,
    )
    db_session.add(org)
    await db_session.flush()  # получаем org.id без полного commit
    await db_session.refresh(org)
    return org


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession, test_org: Organization) -> User:
    """Тестовый пользователь (role=user) привязанный к test_org."""
    user = User(
        email="test@example.com",
        organization_id=test_org.id,
        role="user",
        is_active=True,
    )
    user.set_password("TestPass123")
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession, test_org: Organization) -> User:
    """Тестовый org_admin привязанный к test_org."""
    user = User(
        email="admin@example.com",
        organization_id=test_org.id,
        role="org_admin",
        is_active=True,
    )
    user.set_password("AdminPass123")
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, test_user: User) -> dict:
    """Заголовки Authorization с JWT токеном для test_user."""
    response = await client.post(
        "/api/login",
        json={"email": "test@example.com", "password": "TestPass123"},
    )
    if response.status_code == 200:
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    return {}


@pytest_asyncio.fixture
async def admin_headers(client: AsyncClient, test_admin: User) -> dict:
    """Заголовки Authorization с JWT токеном для test_admin."""
    response = await client.post(
        "/api/login",
        json={"email": "admin@example.com", "password": "AdminPass123"},
    )
    if response.status_code == 200:
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    return {}
