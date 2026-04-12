# Фаза 1: Ядро нового позиционирования — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Новый пользователь регистрируется, выбирает шаблон по типу бизнеса и получает настроенную систему за 2 минуты. Сотрудники могут чекиниться на визитах и загружать фотоотчёты.

**Architecture:** Расширяем существующий FastAPI backend + React frontend. Шаблоны — JSON-файлы в `app/templates/`, применяются при создании организации через новый эндпоинт. Чекины — новые поля в Visit. Фотоотчёты — новая модель VisitPhoto с загрузкой файлов. Онбординг — React-визард, который заменяет текущий редирект после регистрации.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0 (async), Alembic, React 18, TypeScript, MUI v5, TanStack React Query

**PRD:** `docs/superpowers/specs/2026-04-12-repositioning-prd.md`

---

## File Structure

### Backend — новые файлы
- `app/templates/` — директория для JSON-шаблонов
- `app/templates/__init__.py` — загрузка и применение шаблонов
- `app/templates/cleaning.json` — шаблон "Клининг"
- `app/templates/service.json` — шаблон "Сервис и монтаж"
- `app/templates/audit.json` — шаблон "Аудит и проверки"
- `app/templates/sales.json` — шаблон "Торговые представители"
- `app/templates/blank.json` — пустой шаблон
- `app/routers/onboarding_routers.py` — эндпоинт POST /api/onboarding/setup
- `app/schemas/onboarding_schema.py` — Pydantic-схемы онбординга
- `app/services/onboarding_service.py` — логика применения шаблонов
- `app/schemas/visit_photo_schema.py` — схемы фотоотчётов
- `app/routers/visit_photo_routers.py` — эндпоинты фотоотчётов
- `app/services/visit_photo_service.py` — логика загрузки/получения фото
- `app/tests/test_onboarding.py` — тесты онбординга
- `app/tests/test_visit_photos.py` — тесты фотоотчётов
- `app/tests/test_checkin.py` — тесты чекина

### Backend — модификации
- `app/models.py` — новая модель VisitPhoto + новые поля в Visit
- `app/emuns/role_enum.py` — добавить OrgPlan.BUSINESS
- `app/services/plan_limits_service.py` — новые проверки лимитов
- `app/routers/visit_routers.py` — эндпоинты чекина/чекаута
- `app/schemas/visit_schema.py` — схемы чекина
- `app/services/visit_service.py` — логика чекина/чекаута
- `app/main.py` — подключение новых роутеров
- `app/config.py` — настройка UPLOAD_PHOTOS_DIR

### Frontend — новые файлы
- `frontend/src/pages/OnboardingWizard.tsx` — визард онбординга
- `frontend/src/services/onboardingService.ts` — API-клиент онбординга
- `frontend/src/services/visitPhotoService.ts` — API-клиент фотоотчётов
- `frontend/src/components/PhotoUpload.tsx` — компонент загрузки фото
- `frontend/src/components/PhotoGallery.tsx` — компонент просмотра фото
- `frontend/src/components/CheckinButton.tsx` — кнопка чекина с геолокацией

### Frontend — модификации
- `frontend/src/App.tsx` — роут `/onboarding`
- `frontend/src/context/AuthContext.tsx` — редирект на онбординг после регистрации
- `frontend/src/pages/VisitDetailsPage.tsx` — чекин/чекаут + фотоотчёты

### Миграция
- `app/alembic/versions/xxxx_add_checkin_and_photos.py` — новые поля Visit + таблица visit_photos

---

## Task 1: Расширение тарифной модели (Backend)

**Files:**
- Modify: `app/emuns/role_enum.py`
- Modify: `app/services/plan_limits_service.py`
- Modify: `app/routers/auth_routers.py` (дефолт plan_limits при register-org)
- Test: `app/tests/test_plan_limits.py`

- [ ] **Step 1: Добавить тариф BUSINESS в OrgPlan enum**

В `app/emuns/role_enum.py` добавить:

```python
class OrgPlan(str, Enum):
    FREE = "free"
    PRO = "pro"
    BUSINESS = "business"
```

- [ ] **Step 2: Написать тест для новых лимитов**

В `app/tests/test_plan_limits.py` добавить тест:

```python
import pytest
from app.services.plan_limits_service import (
    DEFAULT_PLAN_LIMITS,
    get_plan_limits,
    check_photos_limit,
    check_forms_limit,
)


def test_default_plan_limits_free():
    limits = DEFAULT_PLAN_LIMITS["free"]
    assert limits["max_users"] == 5
    assert limits["max_visits_per_month"] == 100
    assert limits["max_companies"] == 20
    assert limits["max_forms"] == 1
    assert limits["max_fields_per_form"] == 5
    assert limits["max_photos_per_visit"] == 3
    assert limits["custom_checklists"] is False
    assert limits["analytics_export"] is False
    assert limits["integrations"] == []
    assert limits["api_enabled"] is False
    assert limits["white_label"] is False


def test_default_plan_limits_pro():
    limits = DEFAULT_PLAN_LIMITS["pro"]
    assert limits["max_users"] == 50
    assert limits["max_visits_per_month"] is None
    assert limits["max_companies"] is None
    assert limits["max_forms"] is None
    assert limits["max_photos_per_visit"] == 20
    assert limits["integrations"] == ["bitrix24"]
    assert limits["api_enabled"] is False


def test_default_plan_limits_business():
    limits = DEFAULT_PLAN_LIMITS["business"]
    assert limits["max_users"] is None
    assert limits["max_photos_per_visit"] is None
    assert limits["integrations"] == ["bitrix24", "webhooks", "api"]
    assert limits["api_enabled"] is True
    assert limits["white_label"] is True


def test_get_plan_limits_merges_with_defaults():
    """Если в org.plan_limits есть частичные данные, остальное берётся из дефолтов."""
    partial = {"max_users": 10}
    result = get_plan_limits("free", partial)
    assert result["max_users"] == 10  # overridden
    assert result["max_forms"] == 1   # from default
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

```bash
cd /Users/evgenijsikunov/projects/Project_for_my_bussines/opora-platform
docker compose exec backend python -m pytest app/tests/test_plan_limits.py -v -k "test_default_plan_limits or test_get_plan_limits"
```

Expected: FAIL — `DEFAULT_PLAN_LIMITS` и `get_plan_limits` не существуют.

- [ ] **Step 4: Реализовать DEFAULT_PLAN_LIMITS и get_plan_limits**

В `app/services/plan_limits_service.py` добавить в начало файла (после импортов):

```python
DEFAULT_PLAN_LIMITS = {
    "free": {
        "max_users": 5,
        "max_companies": 20,
        "max_visits_per_month": 100,
        "max_forms": 1,
        "max_fields_per_form": 5,
        "max_photos_per_visit": 3,
        "custom_checklists": False,
        "analytics_export": False,
        "integrations": [],
        "api_enabled": False,
        "white_label": False,
    },
    "pro": {
        "max_users": 50,
        "max_companies": None,
        "max_visits_per_month": None,
        "max_forms": None,
        "max_fields_per_form": None,
        "max_photos_per_visit": 20,
        "custom_checklists": True,
        "analytics_export": True,
        "integrations": ["bitrix24"],
        "api_enabled": False,
        "white_label": False,
    },
    "business": {
        "max_users": None,
        "max_companies": None,
        "max_visits_per_month": None,
        "max_forms": None,
        "max_fields_per_form": None,
        "max_photos_per_visit": None,
        "custom_checklists": True,
        "analytics_export": True,
        "integrations": ["bitrix24", "webhooks", "api"],
        "api_enabled": True,
        "white_label": True,
    },
}


def get_plan_limits(plan: str, overrides: dict | None = None) -> dict:
    """Возвращает лимиты тарифа с учётом переопределений из org.plan_limits."""
    defaults = DEFAULT_PLAN_LIMITS.get(plan, DEFAULT_PLAN_LIMITS["free"]).copy()
    if overrides:
        defaults.update(overrides)
    return defaults
```

- [ ] **Step 5: Добавить check_photos_limit и check_forms_limit**

В том же файле `app/services/plan_limits_service.py` добавить:

```python
async def check_photos_limit(session, org_id: int, visit_id: int) -> None:
    """Проверяет лимит фото на визит."""
    org = await _get_org(session, org_id)
    if not org:
        return
    limits = get_plan_limits(org.plan, org.plan_limits)
    max_photos = limits.get("max_photos_per_visit")
    if max_photos is None:
        return
    from app.models import VisitPhoto
    result = await session.execute(
        select(func.count(VisitPhoto.id)).where(
            VisitPhoto.visit_id == visit_id,
            VisitPhoto.organization_id == org_id,
        )
    )
    count = result.scalar()
    if count >= max_photos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Лимит фотографий на визит: {max_photos}. Перейдите на тариф Pro для увеличения лимита.",
        )


async def check_forms_limit(session, org_id: int) -> None:
    """Проверяет лимит форм."""
    org = await _get_org(session, org_id)
    if not org:
        return
    limits = get_plan_limits(org.plan, org.plan_limits)
    max_forms = limits.get("max_forms")
    if max_forms is None:
        return
    from app.models import FormTemplate
    result = await session.execute(
        select(func.count(FormTemplate.id)).where(
            FormTemplate.organization_id == org_id,
        )
    )
    count = result.scalar()
    if count >= max_forms:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Лимит форм: {max_forms}. Перейдите на тариф Pro для создания дополнительных форм.",
        )
```

- [ ] **Step 6: Обновить дефолтные plan_limits при регистрации организации**

В `app/routers/auth_routers.py` найти создание организации в `register-org` и обновить дефолтные plan_limits:

```python
# Заменить текущие дефолты:
# plan_limits={"max_users": 1, "max_visits_per_month": 100}
# На:
from app.services.plan_limits_service import DEFAULT_PLAN_LIMITS

# В теле register-org при создании Organization:
plan_limits=DEFAULT_PLAN_LIMITS["free"]
```

- [ ] **Step 7: Запустить тесты — убедиться, что проходят**

```bash
docker compose exec backend python -m pytest app/tests/test_plan_limits.py -v
```

Expected: ALL PASS

- [ ] **Step 8: Коммит**

```bash
git add app/emuns/role_enum.py app/services/plan_limits_service.py app/routers/auth_routers.py app/tests/test_plan_limits.py
git commit -m "feat: extend plan limits with 3 tiers (free/pro/business) and new limit checks"
```

---

## Task 2: Миграция — поля чекина в Visit + модель VisitPhoto

**Files:**
- Modify: `app/models.py`
- Create: `app/alembic/versions/xxxx_add_checkin_and_photos.py` (via autogenerate)
- Modify: `app/config.py`

- [ ] **Step 1: Добавить поля чекина в модель Visit**

В `app/models.py`, в класс `Visit`, добавить после поля `geo`:

```python
    # Чекин/чекаут с геолокацией
    checkin_at = Column(DateTime(timezone=True), nullable=True)
    checkin_lat = Column(Float, nullable=True)
    checkin_lon = Column(Float, nullable=True)
    checkout_at = Column(DateTime(timezone=True), nullable=True)
    checkout_lat = Column(Float, nullable=True)
    checkout_lon = Column(Float, nullable=True)
```

- [ ] **Step 2: Добавить модель VisitPhoto**

В `app/models.py`, после класса `Visit`, добавить:

```python
class VisitPhoto(Base):
    __tablename__ = "visit_photos"

    id = Column(Integer, primary_key=True, index=True)
    visit_id = Column(Integer, ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    taken_at = Column(DateTime(timezone=True), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)

    visit = relationship("Visit", backref="photos")
    organization = relationship("Organization")
```

- [ ] **Step 3: Добавить UPLOAD_PHOTOS_DIR в config.py**

В `app/config.py` добавить:

```python
UPLOAD_PHOTOS_DIR: str = os.getenv("UPLOAD_PHOTOS_DIR", "./uploads/photos")
```

- [ ] **Step 4: Сгенерировать миграцию**

```bash
docker compose exec backend bash -c "cd /app && alembic revision --autogenerate -m 'add visit checkin fields and visit_photos table'"
```

- [ ] **Step 5: Применить миграцию**

```bash
docker compose exec backend bash -c "cd /app && alembic upgrade head"
```

- [ ] **Step 6: Коммит**

```bash
git add app/models.py app/config.py app/alembic/versions/
git commit -m "feat: add checkin/checkout fields to Visit and VisitPhoto model"
```

---

## Task 3: Чекин/чекаут API

**Files:**
- Create: `app/schemas/visit_schema.py` (добавить CheckinRequest, CheckinResponse)
- Modify: `app/services/visit_service.py`
- Modify: `app/routers/visit_routers.py`
- Create: `app/tests/test_checkin.py`

- [ ] **Step 1: Написать тест для чекина**

Создать `app/tests/test_checkin.py`:

```python
import pytest
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_checkin_saves_coordinates(async_client, auth_headers, test_visit):
    """Чекин сохраняет координаты и время."""
    response = await async_client.post(
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
async def test_checkout_saves_coordinates(async_client, auth_headers, test_visit):
    """Чекаут сохраняет координаты и время."""
    # Сначала чекин
    await async_client.post(
        f"/api/visits/{test_visit.id}/checkin",
        json={"latitude": 55.7558, "longitude": 37.6173},
        headers=auth_headers,
    )
    # Потом чекаут
    response = await async_client.post(
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
async def test_checkout_without_checkin_fails(async_client, auth_headers, test_visit):
    """Нельзя чекаут без чекина."""
    response = await async_client.post(
        f"/api/visits/{test_visit.id}/checkout",
        json={"latitude": 55.7560, "longitude": 37.6175},
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_double_checkin_fails(async_client, auth_headers, test_visit):
    """Нельзя чекин дважды."""
    await async_client.post(
        f"/api/visits/{test_visit.id}/checkin",
        json={"latitude": 55.7558, "longitude": 37.6173},
        headers=auth_headers,
    )
    response = await async_client.post(
        f"/api/visits/{test_visit.id}/checkin",
        json={"latitude": 55.7558, "longitude": 37.6173},
        headers=auth_headers,
    )
    assert response.status_code == 400
```

- [ ] **Step 2: Добавить Pydantic-схемы для чекина**

В `app/schemas/visit_schema.py` добавить:

```python
class CheckinRequest(BaseModel):
    latitude: float
    longitude: float

class CheckinResponse(BaseModel):
    id: int
    checkin_at: datetime | None = None
    checkin_lat: float | None = None
    checkin_lon: float | None = None
    checkout_at: datetime | None = None
    checkout_lat: float | None = None
    checkout_lon: float | None = None
    status: str

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 3: Реализовать checkin/checkout в visit_service.py**

В `app/services/visit_service.py` добавить:

```python
from datetime import datetime, timezone

async def checkin_visit(session, visit_id: int, user_id: int, org_id: int, lat: float, lon: float):
    """Чекин на визите — сохраняет координаты и время прибытия."""
    result = await session.execute(
        select(Visit).where(
            Visit.id == visit_id,
            Visit.organization_id == org_id,
        )
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Визит не найден")
    if visit.checkin_at is not None:
        raise HTTPException(status_code=400, detail="Чекин уже выполнен")
    visit.checkin_at = datetime.now(timezone.utc)
    visit.checkin_lat = lat
    visit.checkin_lon = lon
    visit.status = "in_progress"
    await session.commit()
    await session.refresh(visit)
    return visit


async def checkout_visit(session, visit_id: int, user_id: int, org_id: int, lat: float, lon: float):
    """Чекаут с визита — сохраняет координаты и время ухода."""
    result = await session.execute(
        select(Visit).where(
            Visit.id == visit_id,
            Visit.organization_id == org_id,
        )
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Визит не найден")
    if visit.checkin_at is None:
        raise HTTPException(status_code=400, detail="Сначала выполните чекин")
    if visit.checkout_at is not None:
        raise HTTPException(status_code=400, detail="Чекаут уже выполнен")
    visit.checkout_at = datetime.now(timezone.utc)
    visit.checkout_lat = lat
    visit.checkout_lon = lon
    visit.status = "completed"
    await session.commit()
    await session.refresh(visit)
    return visit
```

- [ ] **Step 4: Добавить роуты чекина**

В `app/routers/visit_routers.py` добавить:

```python
from app.schemas.visit_schema import CheckinRequest, CheckinResponse
from app.services.visit_service import checkin_visit, checkout_visit

@router.post("/{visit_id}/checkin", response_model=CheckinResponse)
async def visit_checkin(
    visit_id: int,
    data: CheckinRequest,
    current_user=Depends(get_current_user),
    session=Depends(get_session),
):
    visit = await checkin_visit(
        session, visit_id, current_user.id, current_user.organization_id,
        data.latitude, data.longitude,
    )
    return visit


@router.post("/{visit_id}/checkout", response_model=CheckinResponse)
async def visit_checkout(
    visit_id: int,
    data: CheckinRequest,
    current_user=Depends(get_current_user),
    session=Depends(get_session),
):
    visit = await checkout_visit(
        session, visit_id, current_user.id, current_user.organization_id,
        data.latitude, data.longitude,
    )
    return visit
```

- [ ] **Step 5: Запустить тесты**

```bash
docker compose exec backend python -m pytest app/tests/test_checkin.py -v
```

Expected: ALL PASS

- [ ] **Step 6: Коммит**

```bash
git add app/schemas/visit_schema.py app/services/visit_service.py app/routers/visit_routers.py app/tests/test_checkin.py
git commit -m "feat: add checkin/checkout API with geolocation"
```

---

## Task 4: Фотоотчёты API

**Files:**
- Create: `app/schemas/visit_photo_schema.py`
- Create: `app/services/visit_photo_service.py`
- Create: `app/routers/visit_photo_routers.py`
- Modify: `app/main.py`
- Create: `app/tests/test_visit_photos.py`

- [ ] **Step 1: Написать тест для загрузки фото**

Создать `app/tests/test_visit_photos.py`:

```python
import pytest
import io


@pytest.mark.asyncio
async def test_upload_photo(async_client, auth_headers, test_visit):
    """Загрузка фото к визиту."""
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    response = await async_client.post(
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
async def test_get_visit_photos(async_client, auth_headers, test_visit):
    """Получение списка фото визита."""
    # Загружаем фото
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    await async_client.post(
        f"/api/visits/{test_visit.id}/photos",
        files={"file": ("test.png", fake_image, "image/png")},
        headers=auth_headers,
    )
    # Получаем список
    response = await async_client.get(
        f"/api/visits/{test_visit.id}/photos",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["visit_id"] == test_visit.id


@pytest.mark.asyncio
async def test_photo_limit_free_plan(async_client, auth_headers, test_visit):
    """На бесплатном тарифе лимит 3 фото на визит."""
    for i in range(3):
        fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
        resp = await async_client.post(
            f"/api/visits/{test_visit.id}/photos",
            files={"file": (f"test{i}.png", fake_image, "image/png")},
            headers=auth_headers,
        )
        assert resp.status_code == 201

    # 4-е фото должно быть отклонено
    fake_image = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
    response = await async_client.post(
        f"/api/visits/{test_visit.id}/photos",
        files={"file": ("test4.png", fake_image, "image/png")},
        headers=auth_headers,
    )
    assert response.status_code == 403
```

- [ ] **Step 2: Создать Pydantic-схемы**

Создать `app/schemas/visit_photo_schema.py`:

```python
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class VisitPhotoResponse(BaseModel):
    id: int
    visit_id: int
    organization_id: int
    file_path: str
    thumbnail_path: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    taken_at: datetime | None = None
    uploaded_at: datetime
    file_size_bytes: int | None = None

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 3: Реализовать сервис фотоотчётов**

Создать `app/services/visit_photo_service.py`:

```python
import os
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import VisitPhoto, Visit
from app.config import UPLOAD_PHOTOS_DIR
from app.services.plan_limits_service import check_photos_limit


async def upload_photo(
    session: AsyncSession,
    visit_id: int,
    org_id: int,
    user_id: int,
    file: UploadFile,
    latitude: float | None = None,
    longitude: float | None = None,
) -> VisitPhoto:
    # Проверить, что визит существует и принадлежит организации
    result = await session.execute(
        select(Visit).where(Visit.id == visit_id, Visit.organization_id == org_id)
    )
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Визит не найден")

    # Проверить лимит фото
    await check_photos_limit(session, org_id, visit_id)

    # Сохранить файл
    org_dir = os.path.join(UPLOAD_PHOTOS_DIR, str(org_id))
    os.makedirs(org_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(org_dir, filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    photo = VisitPhoto(
        visit_id=visit_id,
        organization_id=org_id,
        file_path=file_path,
        latitude=latitude,
        longitude=longitude,
        taken_at=datetime.now(timezone.utc),
        file_size_bytes=len(content),
    )
    session.add(photo)
    await session.commit()
    await session.refresh(photo)
    return photo


async def get_visit_photos(
    session: AsyncSession,
    visit_id: int,
    org_id: int,
) -> list[VisitPhoto]:
    result = await session.execute(
        select(VisitPhoto)
        .where(VisitPhoto.visit_id == visit_id, VisitPhoto.organization_id == org_id)
        .order_by(VisitPhoto.uploaded_at.desc())
    )
    return list(result.scalars().all())


async def delete_photo(
    session: AsyncSession,
    photo_id: int,
    org_id: int,
) -> None:
    result = await session.execute(
        select(VisitPhoto).where(VisitPhoto.id == photo_id, VisitPhoto.organization_id == org_id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    # Удалить файл
    if os.path.exists(photo.file_path):
        os.remove(photo.file_path)

    await session.delete(photo)
    await session.commit()
```

- [ ] **Step 4: Создать роутер фотоотчётов**

Создать `app/routers/visit_photo_routers.py`:

```python
from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import Optional

from app.services.auth_service import get_current_user
from app.database import get_session
from app.schemas.visit_photo_schema import VisitPhotoResponse
from app.services.visit_photo_service import upload_photo, get_visit_photos, delete_photo

router = APIRouter(prefix="/visits", tags=["visit-photos"])


@router.post("/{visit_id}/photos", response_model=VisitPhotoResponse, status_code=201)
async def upload_visit_photo(
    visit_id: int,
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    current_user=Depends(get_current_user),
    session=Depends(get_session),
):
    photo = await upload_photo(
        session, visit_id, current_user.organization_id,
        current_user.id, file, latitude, longitude,
    )
    return photo


@router.get("/{visit_id}/photos", response_model=list[VisitPhotoResponse])
async def list_visit_photos(
    visit_id: int,
    current_user=Depends(get_current_user),
    session=Depends(get_session),
):
    return await get_visit_photos(session, visit_id, current_user.organization_id)


@router.delete("/photos/{photo_id}", status_code=204)
async def remove_photo(
    photo_id: int,
    current_user=Depends(get_current_user),
    session=Depends(get_session),
):
    await delete_photo(session, photo_id, current_user.organization_id)
```

- [ ] **Step 5: Подключить роутер в main.py**

В `app/main.py` добавить:

```python
from app.routers.visit_photo_routers import router as visit_photo_router

# В секции app.include_router:
app.include_router(visit_photo_router, prefix="/api")
```

- [ ] **Step 6: Запустить тесты**

```bash
docker compose exec backend python -m pytest app/tests/test_visit_photos.py -v
```

Expected: ALL PASS

- [ ] **Step 7: Коммит**

```bash
git add app/schemas/visit_photo_schema.py app/services/visit_photo_service.py app/routers/visit_photo_routers.py app/main.py app/tests/test_visit_photos.py
git commit -m "feat: add visit photo upload/list/delete API with plan limits"
```

---

## Task 5: JSON-шаблоны бизнес-процессов

**Files:**
- Create: `app/templates/__init__.py`
- Create: `app/templates/cleaning.json`
- Create: `app/templates/service.json`
- Create: `app/templates/audit.json`
- Create: `app/templates/sales.json`
- Create: `app/templates/blank.json`
- Create: `app/tests/test_onboarding.py` (тест загрузки шаблонов)

- [ ] **Step 1: Создать структуру шаблона cleaning.json**

Создать `app/templates/cleaning.json`:

```json
{
  "id": "cleaning",
  "name": "Клининг",
  "description": "Управление клининговой компанией: визиты на объекты, чек-листы уборки, фотоотчёты до/после",
  "icon": "cleaning_services",
  "form_template": {
    "entity_type": "visit",
    "fields": [
      {
        "id": "cleaning_type",
        "name": "Тип уборки",
        "type": "select",
        "required": true,
        "options": ["Генеральная", "Поддерживающая", "После ремонта", "Мытьё окон"]
      },
      {
        "id": "area_sqm",
        "name": "Площадь (м²)",
        "type": "number",
        "required": false
      },
      {
        "id": "supplies_used",
        "name": "Использованные средства",
        "type": "text",
        "required": false
      },
      {
        "id": "client_notes",
        "name": "Комментарий клиента",
        "type": "textarea",
        "required": false
      }
    ]
  },
  "checklist": {
    "name": "Чек-лист уборки",
    "items": [
      {"id": "floors", "label": "Полы вымыты"},
      {"id": "windows", "label": "Окна вымыты"},
      {"id": "bathroom", "label": "Санузел убран"},
      {"id": "kitchen", "label": "Кухня убрана"},
      {"id": "furniture", "label": "Мебель протёрта"},
      {"id": "trash", "label": "Мусор вынесен"}
    ]
  },
  "statuses": ["planned", "in_progress", "cleaning", "photo_report", "completed", "canceled"],
  "status_labels": {
    "planned": "Назначена",
    "in_progress": "В пути",
    "cleaning": "Выполняется",
    "photo_report": "Фотоотчёт",
    "completed": "Завершена",
    "canceled": "Отменена"
  },
  "role_labels": {
    "org_admin": "Менеджер",
    "user": "Клинер"
  },
  "dashboard_metrics": ["visits_per_day", "avg_duration", "completion_rate"]
}
```

- [ ] **Step 2: Создать service.json**

Создать `app/templates/service.json`:

```json
{
  "id": "service",
  "name": "Сервис и монтаж",
  "description": "Управление сервисной компанией: заявки, выезды, акты выполненных работ, учёт материалов",
  "icon": "build",
  "form_template": {
    "entity_type": "visit",
    "fields": [
      {
        "id": "work_type",
        "name": "Тип работ",
        "type": "select",
        "required": true,
        "options": ["Монтаж", "Ремонт", "Диагностика", "ТО", "Демонтаж"]
      },
      {
        "id": "equipment",
        "name": "Оборудование",
        "type": "text",
        "required": false
      },
      {
        "id": "serial_number",
        "name": "Серийный номер",
        "type": "text",
        "required": false
      },
      {
        "id": "materials_used",
        "name": "Использованные материалы",
        "type": "textarea",
        "required": false
      }
    ]
  },
  "checklist": {
    "name": "Чек-лист работ",
    "items": [
      {"id": "diagnostics", "label": "Диагностика выполнена"},
      {"id": "work_done", "label": "Работы выполнены"},
      {"id": "tested", "label": "Проверка работоспособности"},
      {"id": "cleanup", "label": "Рабочее место убрано"},
      {"id": "client_signed", "label": "Акт подписан клиентом"}
    ]
  },
  "statuses": ["request", "planned", "in_progress", "working", "completed", "canceled"],
  "status_labels": {
    "request": "Заявка",
    "planned": "Назначена",
    "in_progress": "В пути",
    "working": "В работе",
    "completed": "Завершена",
    "canceled": "Отменена"
  },
  "role_labels": {
    "org_admin": "Диспетчер",
    "user": "Инженер"
  },
  "dashboard_metrics": ["requests_per_day", "avg_response_time", "first_fix_rate"]
}
```

- [ ] **Step 3: Создать audit.json**

Создать `app/templates/audit.json`:

```json
{
  "id": "audit",
  "name": "Аудит и проверки",
  "description": "Инспекции точек по чек-листу: проверка стандартов, оценки, отклонения",
  "icon": "fact_check",
  "form_template": {
    "entity_type": "visit",
    "fields": [
      {
        "id": "audit_type",
        "name": "Тип проверки",
        "type": "select",
        "required": true,
        "options": ["Плановая", "Внеплановая", "Повторная"]
      },
      {
        "id": "rating",
        "name": "Общая оценка (1-5)",
        "type": "number",
        "required": true
      },
      {
        "id": "critical_issues",
        "name": "Критические отклонения",
        "type": "textarea",
        "required": false
      },
      {
        "id": "recommendations",
        "name": "Рекомендации",
        "type": "textarea",
        "required": false
      }
    ]
  },
  "checklist": {
    "name": "Чек-лист проверки",
    "items": [
      {"id": "appearance", "label": "Внешний вид объекта"},
      {"id": "documentation", "label": "Документация в порядке"},
      {"id": "standards", "label": "Стандарты соблюдены"},
      {"id": "safety", "label": "Безопасность обеспечена"},
      {"id": "staff", "label": "Персонал на месте"},
      {"id": "equipment_check", "label": "Оборудование исправно"}
    ]
  },
  "statuses": ["planned", "in_progress", "completed", "report_sent", "canceled"],
  "status_labels": {
    "planned": "Запланирована",
    "in_progress": "В процессе",
    "completed": "Завершена",
    "report_sent": "Отчёт отправлен",
    "canceled": "Отменена"
  },
  "role_labels": {
    "org_admin": "Руководитель",
    "user": "Инспектор"
  },
  "dashboard_metrics": ["audits_per_week", "avg_rating", "critical_issues_rate"]
}
```

- [ ] **Step 4: Создать sales.json**

Создать `app/templates/sales.json`:

```json
{
  "id": "sales",
  "name": "Торговые представители",
  "description": "Визиты в точки продаж: сбор заказов, фотоотчёт полки, контроль остатков",
  "icon": "store",
  "form_template": {
    "entity_type": "visit",
    "fields": [
      {
        "id": "visit_purpose",
        "name": "Тип визита",
        "type": "select",
        "required": true,
        "options": ["Плановый", "Внеплановый", "Презентация", "Рекламация"]
      },
      {
        "id": "order_amount",
        "name": "Сумма заказа (₽)",
        "type": "number",
        "required": false
      },
      {
        "id": "stock_notes",
        "name": "Остатки",
        "type": "textarea",
        "required": false
      },
      {
        "id": "competitor_notes",
        "name": "Активность конкурентов",
        "type": "textarea",
        "required": false
      }
    ]
  },
  "checklist": {
    "name": "Чек-лист точки",
    "items": [
      {"id": "display", "label": "Выкладка соответствует планограмме"},
      {"id": "prices", "label": "Ценники актуальны"},
      {"id": "pos", "label": "POS-материалы размещены"},
      {"id": "expiry", "label": "Просрочка отсутствует"},
      {"id": "stock_level", "label": "Остатки достаточные"}
    ]
  },
  "statuses": ["planned", "in_progress", "on_site", "report", "completed", "canceled"],
  "status_labels": {
    "planned": "Запланирован",
    "in_progress": "В пути",
    "on_site": "На точке",
    "report": "Заполняет отчёт",
    "completed": "Завершён",
    "canceled": "Отменён"
  },
  "role_labels": {
    "org_admin": "Супервайзер",
    "user": "Торговый представитель"
  },
  "dashboard_metrics": ["visits_per_day", "total_orders", "plan_completion_rate"]
}
```

- [ ] **Step 5: Создать blank.json**

Создать `app/templates/blank.json`:

```json
{
  "id": "blank",
  "name": "Пустой шаблон",
  "description": "Минимальная настройка — настройте всё под себя",
  "icon": "edit_note",
  "form_template": {
    "entity_type": "visit",
    "fields": [
      {
        "id": "comment",
        "name": "Комментарий",
        "type": "textarea",
        "required": false
      }
    ]
  },
  "checklist": {
    "name": "Чек-лист",
    "items": []
  },
  "statuses": ["planned", "in_progress", "completed", "canceled"],
  "status_labels": {
    "planned": "Назначен",
    "in_progress": "В работе",
    "completed": "Завершён",
    "canceled": "Отменён"
  },
  "role_labels": {
    "org_admin": "Руководитель",
    "user": "Сотрудник"
  },
  "dashboard_metrics": ["visits_per_day", "completion_rate"]
}
```

- [ ] **Step 6: Создать загрузчик шаблонов**

Создать `app/templates/__init__.py`:

```python
import json
import os
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent

_templates_cache: dict | None = None


def load_templates() -> dict:
    """Загрузить все шаблоны из JSON-файлов."""
    global _templates_cache
    if _templates_cache is not None:
        return _templates_cache

    templates = {}
    for file in TEMPLATES_DIR.glob("*.json"):
        with open(file, "r", encoding="utf-8") as f:
            template = json.load(f)
            templates[template["id"]] = template

    _templates_cache = templates
    return templates


def get_template(template_id: str) -> dict | None:
    """Получить шаблон по ID."""
    return load_templates().get(template_id)


def list_templates() -> list[dict]:
    """Список всех шаблонов (id, name, description, icon)."""
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "description": t["description"],
            "icon": t["icon"],
        }
        for t in load_templates().values()
    ]
```

- [ ] **Step 7: Написать тест загрузки шаблонов**

Создать `app/tests/test_onboarding.py`:

```python
from app.templates import load_templates, get_template, list_templates


def test_load_all_templates():
    templates = load_templates()
    assert "cleaning" in templates
    assert "service" in templates
    assert "audit" in templates
    assert "sales" in templates
    assert "blank" in templates


def test_template_structure():
    t = get_template("cleaning")
    assert t is not None
    assert "form_template" in t
    assert "checklist" in t
    assert "statuses" in t
    assert "status_labels" in t
    assert "role_labels" in t
    assert len(t["form_template"]["fields"]) > 0
    assert len(t["checklist"]["items"]) > 0


def test_list_templates():
    items = list_templates()
    assert len(items) == 5
    ids = [i["id"] for i in items]
    assert "cleaning" in ids
    assert "blank" in ids


def test_blank_template_minimal():
    t = get_template("blank")
    assert len(t["form_template"]["fields"]) == 1
    assert len(t["checklist"]["items"]) == 0
```

- [ ] **Step 8: Запустить тесты**

```bash
docker compose exec backend python -m pytest app/tests/test_onboarding.py -v -k "test_load or test_template or test_list or test_blank"
```

Expected: ALL PASS

- [ ] **Step 9: Коммит**

```bash
git add app/templates/
git commit -m "feat: add 5 business templates (cleaning, service, audit, sales, blank)"
```

---

## Task 6: Онбординг API — применение шаблона

**Files:**
- Create: `app/schemas/onboarding_schema.py`
- Create: `app/services/onboarding_service.py`
- Create: `app/routers/onboarding_routers.py`
- Modify: `app/main.py`
- Modify: `app/tests/test_onboarding.py`

- [ ] **Step 1: Написать тест для эндпоинта setup**

В `app/tests/test_onboarding.py` добавить:

```python
import pytest


@pytest.mark.asyncio
async def test_setup_organization_with_template(async_client, auth_headers_org_admin):
    """Применение шаблона создаёт FormTemplate и CustomSection."""
    response = await async_client.post(
        "/api/onboarding/setup",
        json={
            "template_id": "cleaning",
            "company_name": "Тест Клининг",
            "team_size": "1-5",
        },
        headers=auth_headers_org_admin,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["template_applied"] == "cleaning"
    assert data["form_fields_count"] > 0
    assert data["checklist_items_count"] > 0


@pytest.mark.asyncio
async def test_setup_with_invalid_template(async_client, auth_headers_org_admin):
    """Несуществующий шаблон → 404."""
    response = await async_client.post(
        "/api/onboarding/setup",
        json={
            "template_id": "nonexistent",
            "company_name": "Test",
            "team_size": "1-5",
        },
        headers=auth_headers_org_admin,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_templates_endpoint(async_client):
    """GET /api/onboarding/templates возвращает список шаблонов."""
    response = await async_client.get("/api/onboarding/templates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    assert all("id" in t and "name" in t for t in data)
```

- [ ] **Step 2: Создать Pydantic-схемы онбординга**

Создать `app/schemas/onboarding_schema.py`:

```python
from pydantic import BaseModel


class SetupRequest(BaseModel):
    template_id: str
    company_name: str
    team_size: str  # "1-5", "6-20", "21-50", "50+"


class SetupResponse(BaseModel):
    template_applied: str
    template_name: str
    form_fields_count: int
    checklist_items_count: int
    statuses: list[str]
    message: str


class TemplateInfo(BaseModel):
    id: str
    name: str
    description: str
    icon: str
```

- [ ] **Step 3: Реализовать сервис онбординга**

Создать `app/services/onboarding_service.py`:

```python
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models import Organization, FormTemplate, CustomSection
from app.templates import get_template


async def apply_template(
    session: AsyncSession,
    org_id: int,
    template_id: str,
    company_name: str,
    team_size: str,
) -> dict:
    """Применить шаблон к организации: создать FormTemplate + CustomSection + обновить настройки."""
    template = get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Шаблон '{template_id}' не найден")

    # Получить организацию
    result = await session.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Организация не найдена")

    # Обновить название и настройки организации
    if company_name:
        org.name = company_name

    org_settings = org.settings or {}
    org_settings["template_id"] = template_id
    org_settings["team_size"] = team_size
    org_settings["statuses"] = template["statuses"]
    org_settings["status_labels"] = template["status_labels"]
    org_settings["role_labels"] = template["role_labels"]
    org_settings["dashboard_metrics"] = template["dashboard_metrics"]
    org_settings["onboarding_completed"] = True
    org.settings = org_settings

    # Удалить старые FormTemplate для visit (если есть)
    await session.execute(
        delete(FormTemplate).where(
            FormTemplate.organization_id == org_id,
            FormTemplate.entity_type == "visit",
        )
    )

    # Создать FormTemplate из шаблона
    form_data = template["form_template"]
    checklist = template["checklist"]

    # Добавить чек-лист как поле типа checklist в форму
    fields = list(form_data["fields"])
    if checklist["items"]:
        fields.append({
            "id": "checklist",
            "name": checklist["name"],
            "type": "checklist",
            "required": False,
            "items": checklist["items"],
        })

    form_template = FormTemplate(
        organization_id=org_id,
        entity_type=form_data["entity_type"],
        fields=fields,
    )
    session.add(form_template)

    await session.commit()

    return {
        "template_applied": template_id,
        "template_name": template["name"],
        "form_fields_count": len(form_data["fields"]),
        "checklist_items_count": len(checklist["items"]),
        "statuses": template["statuses"],
        "message": f"Шаблон «{template['name']}» применён. Система готова к работе.",
    }
```

- [ ] **Step 4: Создать роутер онбординга**

Создать `app/routers/onboarding_routers.py`:

```python
from fastapi import APIRouter, Depends

from app.services.auth_service import get_current_user, get_current_active_admin_user
from app.database import get_session
from app.schemas.onboarding_schema import SetupRequest, SetupResponse, TemplateInfo
from app.services.onboarding_service import apply_template
from app.templates import list_templates

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/templates", response_model=list[TemplateInfo])
async def get_templates():
    """Список доступных шаблонов. Публичный — нужен на онбординге до авторизации нет, но после регистрации."""
    return list_templates()


@router.post("/setup", response_model=SetupResponse)
async def setup_organization(
    data: SetupRequest,
    current_user=Depends(get_current_active_admin_user),
    session=Depends(get_session),
):
    """Применить шаблон к организации. Только org_admin."""
    return await apply_template(
        session,
        current_user.organization_id,
        data.template_id,
        data.company_name,
        data.team_size,
    )
```

- [ ] **Step 5: Подключить роутер в main.py**

В `app/main.py` добавить:

```python
from app.routers.onboarding_routers import router as onboarding_router

app.include_router(onboarding_router, prefix="/api")
```

- [ ] **Step 6: Запустить тесты**

```bash
docker compose exec backend python -m pytest app/tests/test_onboarding.py -v
```

Expected: ALL PASS

- [ ] **Step 7: Коммит**

```bash
git add app/schemas/onboarding_schema.py app/services/onboarding_service.py app/routers/onboarding_routers.py app/main.py app/tests/test_onboarding.py
git commit -m "feat: add onboarding API — apply business template to organization"
```

---

## Task 7: Frontend — API-клиенты

**Files:**
- Create: `frontend/src/services/onboardingService.ts`
- Create: `frontend/src/services/visitPhotoService.ts`

- [ ] **Step 1: Создать API-клиент онбординга**

Создать `frontend/src/services/onboardingService.ts`:

```typescript
import api from './api';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface SetupRequest {
  template_id: string;
  company_name: string;
  team_size: string;
}

export interface SetupResponse {
  template_applied: string;
  template_name: string;
  form_fields_count: number;
  checklist_items_count: number;
  statuses: string[];
  message: string;
}

export const onboardingService = {
  getTemplates: () =>
    api.get<TemplateInfo[]>('/onboarding/templates').then((r) => r.data),

  setup: (data: SetupRequest) =>
    api.post<SetupResponse>('/onboarding/setup', data).then((r) => r.data),
};
```

- [ ] **Step 2: Создать API-клиент фотоотчётов**

Создать `frontend/src/services/visitPhotoService.ts`:

```typescript
import api from './api';

export interface VisitPhoto {
  id: number;
  visit_id: number;
  organization_id: number;
  file_path: string;
  thumbnail_path: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  uploaded_at: string;
  file_size_bytes: number | null;
}

export const visitPhotoService = {
  upload: (visitId: number, file: File, latitude?: number, longitude?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (latitude !== undefined) formData.append('latitude', String(latitude));
    if (longitude !== undefined) formData.append('longitude', String(longitude));
    return api
      .post<VisitPhoto>(`/visits/${visitId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  list: (visitId: number) =>
    api.get<VisitPhoto[]>(`/visits/${visitId}/photos`).then((r) => r.data),

  delete: (photoId: number) =>
    api.delete(`/visits/photos/${photoId}`),
};
```

- [ ] **Step 3: Коммит**

```bash
git add frontend/src/services/onboardingService.ts frontend/src/services/visitPhotoService.ts
git commit -m "feat: add frontend API clients for onboarding and visit photos"
```

---

## Task 8: Frontend — OnboardingWizard

**Files:**
- Create: `frontend/src/pages/OnboardingWizard.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Создать OnboardingWizard**

Создать `frontend/src/pages/OnboardingWizard.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  TextField,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CleaningServices,
  Build,
  FactCheck,
  Store,
  EditNote,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  onboardingService,
  TemplateInfo,
  SetupResponse,
} from '../services/onboardingService';

const ICON_MAP: Record<string, React.ReactElement> = {
  cleaning_services: <CleaningServices sx={{ fontSize: 48 }} />,
  build: <Build sx={{ fontSize: 48 }} />,
  fact_check: <FactCheck sx={{ fontSize: 48 }} />,
  store: <Store sx={{ fontSize: 48 }} />,
  edit_note: <EditNote sx={{ fontSize: 48 }} />,
};

const TEAM_SIZES = ['1-5', '6-20', '21-50', '50+'];

const steps = ['Название компании', 'Тип бизнеса', 'Размер команды', 'Готово!'];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onboardingService.getTemplates().then(setTemplates).catch(console.error);
  }, []);

  const handleNext = async () => {
    if (activeStep === 2 && selectedTemplate && teamSize) {
      setLoading(true);
      setError(null);
      try {
        const res = await onboardingService.setup({
          template_id: selectedTemplate,
          company_name: companyName,
          team_size: teamSize,
        });
        setResult(res);
        setActiveStep(3);
      } catch (e: any) {
        setError(e.response?.data?.detail || 'Ошибка при настройке');
      } finally {
        setLoading(false);
      }
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return companyName.trim().length > 0;
    if (activeStep === 1) return selectedTemplate !== null;
    if (activeStep === 2) return teamSize !== null;
    return false;
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, px: 2 }}>
      <Typography variant="h4" gutterBottom align="center">
        Настройка ОПОРА
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Шаг 1: Название компании */}
      {activeStep === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Как называется ваша компания?
          </Typography>
          <TextField
            fullWidth
            label="Название компании"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoFocus
            sx={{ mb: 3 }}
          />
        </Box>
      )}

      {/* Шаг 2: Выбор шаблона */}
      {activeStep === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Чем занимается ваша команда?
          </Typography>
          <Grid container spacing={2}>
            {templates.map((t) => (
              <Grid item xs={6} key={t.id}>
                <Card
                  variant={selectedTemplate === t.id ? 'elevation' : 'outlined'}
                  sx={{
                    border: selectedTemplate === t.id ? 2 : 1,
                    borderColor:
                      selectedTemplate === t.id ? 'primary.main' : 'divider',
                  }}
                >
                  <CardActionArea
                    onClick={() => setSelectedTemplate(t.id)}
                    sx={{ p: 2, textAlign: 'center' }}
                  >
                    {ICON_MAP[t.icon] || <EditNote sx={{ fontSize: 48 }} />}
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {t.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Шаг 3: Размер команды */}
      {activeStep === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Сколько выездных сотрудников?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
            {TEAM_SIZES.map((size) => (
              <Chip
                key={size}
                label={size}
                clickable
                color={teamSize === size ? 'primary' : 'default'}
                variant={teamSize === size ? 'filled' : 'outlined'}
                onClick={() => setTeamSize(size)}
                sx={{ fontSize: '1.1rem', py: 2.5, px: 1 }}
              />
            ))}
          </Box>
          {teamSize === '50+' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Для команд от 50 человек рекомендуем тариф Pro (399 ₽/чел/мес) или
              Business (699 ₽/чел/мес).
            </Alert>
          )}
        </Box>
      )}

      {/* Шаг 4: Результат */}
      {activeStep === 3 && result && (
        <Box textAlign="center">
          <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Готово!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {result.message}
          </Typography>
          <Box sx={{ textAlign: 'left', mb: 3, mx: 'auto', maxWidth: 400 }}>
            <Typography>
              ✅ Форма визита: {result.form_fields_count} полей
            </Typography>
            <Typography>
              ✅ Чек-лист: {result.checklist_items_count} пунктов
            </Typography>
            <Typography>
              ✅ Статусы: {result.statuses.length} этапов
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/visits/new')}
            >
              Создать первый визит
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/admin/user-management')}
            >
              Пригласить сотрудника
            </Button>
          </Box>
        </Box>
      )}

      {/* Навигация */}
      {activeStep < 3 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => prev - 1)}
          >
            Назад
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Далее'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Добавить роут /onboarding в App.tsx**

В `frontend/src/App.tsx`, в секцию protected routes, добавить:

```tsx
// Импорт:
const OnboardingWizard = React.lazy(() => import('./pages/OnboardingWizard'));

// В Route (внутри protected routes, перед </Routes>):
<Route path="/onboarding" element={<OnboardingWizard />} />
```

- [ ] **Step 3: Добавить редирект на онбординг после регистрации**

В `frontend/src/context/AuthContext.tsx`, в функции `login` или в компоненте `RegisterPage`, после успешной регистрации через `register-org`, вместо навигации на `/visits` навигировать на `/onboarding`.

Найти в `RegisterPage.tsx` (или где происходит redirect после register-org) и заменить:

```tsx
// Было:
navigate('/visits');
// или navigate('/');

// Стало:
navigate('/onboarding');
```

Также в `HomeRedirect` (или аналогичном компоненте) добавить проверку:

```tsx
// Если организация не прошла онбординг — перенаправить
// Проверяем через user.organization_id и наличие settings.onboarding_completed
// Это можно проверить через отдельный запрос или добавить в user response
```

Примечание: для MVP достаточно просто редиректить после регистрации на `/onboarding`. Проверку `onboarding_completed` можно добавить позже.

- [ ] **Step 4: Проверить визуально**

```bash
cd frontend && npm start
```

1. Открыть http://localhost:4200/register
2. Зарегистрировать новую организацию
3. Убедиться, что после регистрации открывается /onboarding
4. Пройти все 4 шага визарда
5. Убедиться, что на последнем шаге показывается результат

- [ ] **Step 5: Коммит**

```bash
git add frontend/src/pages/OnboardingWizard.tsx frontend/src/App.tsx frontend/src/context/AuthContext.tsx frontend/src/pages/RegisterPage.tsx
git commit -m "feat: add onboarding wizard with template selection"
```

---

## Task 9: Frontend — компоненты чекина и фотоотчётов

**Files:**
- Create: `frontend/src/components/CheckinButton.tsx`
- Create: `frontend/src/components/PhotoUpload.tsx`
- Create: `frontend/src/components/PhotoGallery.tsx`
- Modify: `frontend/src/pages/VisitDetailsPage.tsx`

- [ ] **Step 1: Создать CheckinButton**

Создать `frontend/src/components/CheckinButton.tsx`:

```tsx
import React, { useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import { LocationOn, Logout } from '@mui/icons-material';
import api from '../services/api';

interface CheckinButtonProps {
  visitId: number;
  checkinAt: string | null;
  checkoutAt: string | null;
  onUpdate: () => void;
}

export default function CheckinButton({
  visitId,
  checkinAt,
  checkoutAt,
  onUpdate,
}: CheckinButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = (): Promise<{ latitude: number; longitude: number }> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        (err) => reject(new Error('Не удалось определить местоположение')),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  const handleCheckin = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getLocation();
      await api.post(`/visits/${visitId}/checkin`, coords);
      onUpdate();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getLocation();
      await api.post(`/visits/${visitId}/checkout`, coords);
      onUpdate();
    } catch (e: any) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkoutAt) {
    return null; // Визит завершён, кнопки не нужны
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      {!checkinAt ? (
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <LocationOn />}
          onClick={handleCheckin}
          disabled={loading}
          fullWidth
          size="large"
        >
          Начать визит
        </Button>
      ) : (
        <Button
          variant="contained"
          color="secondary"
          startIcon={loading ? <CircularProgress size={20} /> : <Logout />}
          onClick={handleCheckout}
          disabled={loading}
          fullWidth
          size="large"
        >
          Завершить визит
        </Button>
      )}
    </>
  );
}
```

- [ ] **Step 2: Создать PhotoUpload**

Создать `frontend/src/components/PhotoUpload.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { visitPhotoService } from '../services/visitPhotoService';

interface PhotoUploadProps {
  visitId: number;
  onUploaded: () => void;
}

export default function PhotoUpload({ visitId, onUploaded }: PhotoUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      // Попробуем получить координаты
      let lat: number | undefined;
      let lon: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        // Координаты не обязательны
      }

      await visitPhotoService.upload(visitId, file, lat, lon);
      onUploaded();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Ошибка загрузки фото');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={20} /> : <PhotoCamera />}
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        fullWidth
      >
        Сделать фото
      </Button>
    </>
  );
}
```

- [ ] **Step 3: Создать PhotoGallery**

Создать `frontend/src/components/PhotoGallery.tsx`:

```tsx
import React from 'react';
import {
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { VisitPhoto, visitPhotoService } from '../services/visitPhotoService';

interface PhotoGalleryProps {
  photos: VisitPhoto[];
  onDeleted: () => void;
  canDelete?: boolean;
}

export default function PhotoGallery({
  photos,
  onDeleted,
  canDelete = true,
}: PhotoGalleryProps) {
  const handleDelete = async (photoId: number) => {
    if (!window.confirm('Удалить фото?')) return;
    await visitPhotoService.delete(photoId);
    onDeleted();
  };

  if (photos.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Фотоотчёт пуст
      </Typography>
    );
  }

  return (
    <ImageList cols={3} gap={8}>
      {photos.map((photo) => (
        <ImageListItem key={photo.id}>
          <img
            src={`/api/uploads/photos/${photo.file_path.split('/').slice(-2).join('/')}`}
            alt={`Фото ${photo.id}`}
            loading="lazy"
            style={{ borderRadius: 8, objectFit: 'cover', height: 200 }}
          />
          <ImageListItemBar
            subtitle={
              photo.uploaded_at
                ? new Date(photo.uploaded_at).toLocaleTimeString('ru-RU')
                : ''
            }
            actionIcon={
              canDelete ? (
                <IconButton
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                  onClick={() => handleDelete(photo.id)}
                >
                  <Delete />
                </IconButton>
              ) : undefined
            }
          />
        </ImageListItem>
      ))}
    </ImageList>
  );
}
```

- [ ] **Step 4: Интегрировать в VisitDetailsPage**

В `frontend/src/pages/VisitDetailsPage.tsx` добавить секции чекина и фотоотчётов. Найти место, где отображается информация о визите, и добавить:

```tsx
// Импорты:
import CheckinButton from '../components/CheckinButton';
import PhotoUpload from '../components/PhotoUpload';
import PhotoGallery from '../components/PhotoGallery';
import { visitPhotoService, VisitPhoto } from '../services/visitPhotoService';

// В компоненте — загрузка фото:
const [photos, setPhotos] = useState<VisitPhoto[]>([]);

const loadPhotos = async () => {
  if (visit?.id) {
    const data = await visitPhotoService.list(visit.id);
    setPhotos(data);
  }
};

useEffect(() => {
  loadPhotos();
}, [visit?.id]);

// В JSX, после основной информации о визите:
<Box sx={{ mt: 3 }}>
  <Typography variant="h6" gutterBottom>Чекин</Typography>
  <CheckinButton
    visitId={visit.id}
    checkinAt={visit.checkin_at}
    checkoutAt={visit.checkout_at}
    onUpdate={refetch}
  />
</Box>

<Box sx={{ mt: 3 }}>
  <Typography variant="h6" gutterBottom>Фотоотчёт ({photos.length})</Typography>
  <PhotoUpload visitId={visit.id} onUploaded={loadPhotos} />
  <PhotoGallery photos={photos} onDeleted={loadPhotos} />
</Box>
```

- [ ] **Step 5: Добавить статический роут для фото в backend**

В `app/main.py` добавить раздачу загруженных файлов:

```python
from fastapi.staticfiles import StaticFiles
from app.config import UPLOAD_PHOTOS_DIR
import os

# После всех include_router:
os.makedirs(UPLOAD_PHOTOS_DIR, exist_ok=True)
app.mount("/api/uploads/photos", StaticFiles(directory=UPLOAD_PHOTOS_DIR), name="photos")
```

- [ ] **Step 6: Проверить визуально**

1. Открыть визит в браузере
2. Нажать "Начать визит" — должен запросить геолокацию и выполнить чекин
3. Сделать фото — камера открывается (или выбор файла на десктопе)
4. Фото появляется в галерее
5. Нажать "Завершить визит" — чекаут

- [ ] **Step 7: Коммит**

```bash
git add frontend/src/components/CheckinButton.tsx frontend/src/components/PhotoUpload.tsx frontend/src/components/PhotoGallery.tsx frontend/src/pages/VisitDetailsPage.tsx app/main.py
git commit -m "feat: add checkin button, photo upload/gallery, integrate in visit details"
```

---

## Task 10: Интеграционная проверка и финальный коммит

- [ ] **Step 1: Запустить все бэкенд-тесты**

```bash
docker compose exec backend python -m pytest app/tests/ -v
```

Expected: ALL PASS

- [ ] **Step 2: Проверить фронтенд сборку**

```bash
cd frontend && npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: End-to-end проверка**

1. `docker compose up --build`
2. Открыть http://localhost:4200/register
3. Зарегистрировать новую организацию
4. Пройти онбординг-визард (выбрать "Клининг")
5. Создать визит
6. Открыть визит → нажать "Начать визит" (чекин)
7. Загрузить фото
8. Нажать "Завершить визит" (чекаут)
9. Проверить, что на странице визита видны координаты и фото

- [ ] **Step 4: Финальный коммит (если были правки)**

```bash
git add -A
git commit -m "fix: integration fixes for phase 1 onboarding + checkin + photos"
```
