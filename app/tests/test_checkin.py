"""Тесты для чекин/чекаут API."""
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, User, Visit


# ─── Fixture: test_company ────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_company(db_session: AsyncSession, test_org) -> Company:
    """Тестовая компания привязанная к test_org."""
    company = Company(
        name="Test Company",
        organization_id=test_org.id,
    )
    db_session.add(company)
    await db_session.flush()
    await db_session.refresh(company)
    return company


# ─── Fixture: test_visit ─────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_visit(db_session: AsyncSession, test_user: User, test_company: Company) -> Visit:
    """Тестовый визит в статусе planned."""
    from datetime import datetime, timezone
    visit = Visit(
        company_id=test_company.id,
        user_id=test_user.id,
        organization_id=test_user.organization_id,
        date=datetime.now(timezone.utc),
        status="planned",
    )
    db_session.add(visit)
    await db_session.flush()
    await db_session.refresh(visit)
    return visit


# ─── Tests ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_checkin_saves_coordinates(client: AsyncClient, auth_headers, test_visit):
    """Чекин сохраняет координаты и время."""
    response = await client.post(
        f"/api/visits/{test_visit.id}/checkin",
        json={"latitude": 55.7558, "longitude": 37.6173},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["checkin_lat"] == pytest.approx(55.7558)
    assert data["checkin_lon"] == pytest.approx(37.6173)
    assert data["checkin_at"] is not None


@pytest.mark.asyncio
async def test_checkout_saves_coordinates(client: AsyncClient, auth_headers, test_visit):
    """Чекаут сохраняет координаты и время."""
    # Сначала чекин
    await client.post(
        f"/api/visits/{test_visit.id}/checkin",
        json={"latitude": 55.7558, "longitude": 37.6173},
        headers=auth_headers,
    )
    # Потом чекаут
    response = await client.post(
        f"/api/visits/{test_visit.id}/checkout",
        json={"latitude": 55.7560, "longitude": 37.6175},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["checkout_lat"] == pytest.approx(55.7560)
    assert data["checkout_lon"] == pytest.approx(37.6175)
    assert data["checkout_at"] is not None


@pytest.mark.asyncio
async def test_checkout_without_checkin_fails(client: AsyncClient, auth_headers, test_visit):
    """Нельзя чекаут без чекина."""
    response = await client.post(
        f"/api/visits/{test_visit.id}/checkout",
        json={"latitude": 55.7560, "longitude": 37.6175},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_double_checkin_fails(client: AsyncClient, auth_headers, test_visit):
    """Нельзя чекин дважды."""
    await client.post(
        f"/api/visits/{test_visit.id}/checkin",
        json={"latitude": 55.7558, "longitude": 37.6173},
        headers=auth_headers,
    )
    response = await client.post(
        f"/api/visits/{test_visit.id}/checkin",
        json={"latitude": 55.7558, "longitude": 37.6173},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_regular_user_cannot_checkin_other_users_visit(
    client: AsyncClient,
    db_session,
    test_org,
    test_user: User,
    test_admin: User,
    auth_headers,
):
    """Regular user cannot checkin on a visit assigned to another user."""
    from datetime import datetime, timezone

    # Create a company for the visit
    company = Company(
        name="Other Company",
        organization_id=test_org.id,
    )
    db_session.add(company)
    await db_session.flush()
    await db_session.refresh(company)

    # Create a visit assigned to the admin user (not test_user)
    admin_visit = Visit(
        company_id=company.id,
        user_id=test_admin.id,
        organization_id=test_org.id,
        date=datetime.now(timezone.utc),
        status="planned",
    )
    db_session.add(admin_visit)
    await db_session.flush()
    await db_session.refresh(admin_visit)

    # Try to checkin as test_user on a visit belonging to test_admin
    response = await client.post(
        f"/api/visits/{admin_visit.id}/checkin",
        json={"latitude": 55.7558, "longitude": 37.6173},
        headers=auth_headers,
    )
    # Must be denied — visit not found for this user
    assert response.status_code in (403, 404)
