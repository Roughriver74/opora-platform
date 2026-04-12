"""Тесты для API фотоотчётов визитов."""
import io
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, User, Visit


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_company(db_session: AsyncSession, test_org) -> Company:
    """Тестовая компания для фото-тестов."""
    company = Company(
        name="Photo Test Company",
        organization_id=test_org.id,
    )
    db_session.add(company)
    await db_session.flush()
    await db_session.refresh(company)
    return company


@pytest_asyncio.fixture
async def test_visit(db_session: AsyncSession, test_user: User, test_company: Company) -> Visit:
    """Тестовый визит для фото-тестов."""
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
async def test_upload_photo(client: AsyncClient, auth_headers, test_visit):
    """Загрузка фото к визиту."""
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    response = await client.post(
        f"/api/visits/{test_visit.id}/photos",
        files={"file": ("test.png", fake_image, "image/png")},
        data={"latitude": "55.7558", "longitude": "37.6173"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["visit_id"] == test_visit.id
    assert data["latitude"] == pytest.approx(55.7558)
    assert "file_path" in data


@pytest.mark.asyncio
async def test_get_visit_photos(client: AsyncClient, auth_headers, test_visit):
    """Получение списка фото визита."""
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    await client.post(
        f"/api/visits/{test_visit.id}/photos",
        files={"file": ("test.png", fake_image, "image/png")},
        headers=auth_headers,
    )
    response = await client.get(
        f"/api/visits/{test_visit.id}/photos",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["visit_id"] == test_visit.id


@pytest.mark.asyncio
async def test_photo_limit_free_plan(client: AsyncClient, auth_headers, test_visit):
    """На бесплатном тарифе лимит 3 фото на визит."""
    for i in range(3):
        fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
        resp = await client.post(
            f"/api/visits/{test_visit.id}/photos",
            files={"file": (f"test{i}.png", fake_image, "image/png")},
            headers=auth_headers,
        )
        assert resp.status_code == 201

    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    response = await client.post(
        f"/api/visits/{test_visit.id}/photos",
        files={"file": ("test4.png", fake_image, "image/png")},
        headers=auth_headers,
    )
    assert response.status_code == 403
