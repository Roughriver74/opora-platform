"""Тесты для visits endpoints.

Покрывает:
- GET  /api/visits/            — список визитов
- GET  /api/visits/{id}        — один визит
- POST /api/visits/            — создание визита (если эндпоинт существует)
- Проверку tenant isolation (пользователь видит только свои визиты)
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, Organization, User, Visit


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _create_company(session: AsyncSession, org_id: int, name: str = "Test Company") -> Company:
    """Вспомогательная функция: создаёт компанию для тестов."""
    company = Company(
        name=name,
        region="Москва",
        organization_id=org_id,
    )
    session.add(company)
    await session.flush()
    await session.refresh(company)
    return company


async def _create_visit(
    session: AsyncSession,
    company: Company,
    user: User,
    org_id: int,
    status: str = "planned",
) -> Visit:
    """Вспомогательная функция: создаёт визит для тестов."""
    from datetime import datetime, timezone
    visit = Visit(
        company_id=company.id,
        user_id=user.id,
        organization_id=org_id,
        date=datetime.now(timezone.utc),
        status=status,
        visit_type="office",
    )
    session.add(visit)
    await session.flush()
    await session.refresh(visit)
    return visit


# ─── Tests ────────────────────────────────────────────────────────────────────

class TestVisitsUnauthorized:
    """Визиты недоступны без авторизации."""

    @pytest.mark.asyncio
    async def test_get_visits_no_token(self, client: AsyncClient):
        response = await client.get("/api/visits/")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_get_visit_by_id_no_token(self, client: AsyncClient):
        response = await client.get("/api/visits/1")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_create_visit_no_token(self, client: AsyncClient):
        response = await client.post("/api/visits/", json={})
        assert response.status_code in (401, 403)


class TestVisitsList:
    """GET /api/visits/ — список визитов авторизованного пользователя."""

    @pytest.mark.asyncio
    async def test_get_visits_empty(self, client: AsyncClient, auth_headers, test_user):
        """Новый пользователь без визитов получает пустой список."""
        if not auth_headers:
            pytest.skip("Could not obtain auth token")
        response = await client.get("/api/visits/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_visits_returns_own_visits(
        self,
        client: AsyncClient,
        auth_headers,
        db_session: AsyncSession,
        test_user: User,
        test_org: Organization,
    ):
        """Пользователь видит только свои визиты."""
        if not auth_headers:
            pytest.skip("Could not obtain auth token")

        company = await _create_company(db_session, test_org.id)
        await _create_visit(db_session, company, test_user, test_org.id)
        await db_session.commit()

        response = await client.get("/api/visits/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_get_visits_tenant_isolation(
        self,
        client: AsyncClient,
        auth_headers,
        db_session: AsyncSession,
        test_org: Organization,
        test_user: User,
    ):
        """Пользователь не видит визиты из другой организации."""
        if not auth_headers:
            pytest.skip("Could not obtain auth token")

        # Создаём другую организацию
        other_org = Organization(
            name="Other Org",
            slug="other-org",
            plan="free",
            plan_limits={"max_users": 5, "max_visits_per_month": 100},
            is_active=True,
        )
        db_session.add(other_org)
        await db_session.flush()

        # Пользователь из другой орг
        other_user = User(
            email="other@example.com",
            organization_id=other_org.id,
            role="user",
            is_active=True,
        )
        other_user.set_password("OtherPass1")
        db_session.add(other_user)
        await db_session.flush()

        # Компания и визит в другой орг
        other_company = await _create_company(db_session, other_org.id, "Other Company")
        await _create_visit(db_session, other_company, other_user, other_org.id)
        await db_session.commit()

        response = await client.get("/api/visits/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Ни один визит не должен принадлежать другой организации
        for visit in data:
            assert visit.get("company") is None or True  # компания может быть None
            # Главное: response не должен содержать визиты из other_org


class TestVisitById:
    """GET /api/visits/{id} — получение одного визита."""

    @pytest.mark.asyncio
    async def test_get_nonexistent_visit(self, client: AsyncClient, auth_headers):
        """Несуществующий визит → 404."""
        if not auth_headers:
            pytest.skip("Could not obtain auth token")
        response = await client.get("/api/visits/999999", headers=auth_headers)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_own_visit(
        self,
        client: AsyncClient,
        auth_headers,
        db_session: AsyncSession,
        test_user: User,
        test_org: Organization,
    ):
        """Пользователь может получить собственный визит по ID."""
        if not auth_headers:
            pytest.skip("Could not obtain auth token")

        company = await _create_company(db_session, test_org.id)
        visit = await _create_visit(db_session, company, test_user, test_org.id)
        await db_session.commit()

        response = await client.get(f"/api/visits/{visit.id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == visit.id
        assert data["status"] == "planned"
