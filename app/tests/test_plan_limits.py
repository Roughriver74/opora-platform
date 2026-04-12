"""Тесты тарифных лимитов (plan_limits_service).

Покрывает:
- check_visits_monthly_limit  — лимит визитов в месяц
- check_users_limit           — лимит пользователей
- check_companies_limit       — лимит компаний
- Поведение при несуществующей организации
- Поведение когда лимит не задан (None)
- Бросок HTTPException 403 при исчерпании лимита
"""
import pytest
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, Organization, User, Visit
from app.services.plan_limits_service import (
    check_companies_limit,
    check_users_limit,
    check_visits_monthly_limit,
)


# ─── check_visits_monthly_limit ───────────────────────────────────────────────

class TestCheckVisitsMonthlyLimit:

    @pytest.mark.asyncio
    async def test_nonexistent_org_does_not_raise(self, db_session: AsyncSession):
        """Если организация не найдена — функция не бросает исключений."""
        # Не должно бросить HTTPException
        await check_visits_monthly_limit(db_session, org_id=999999)

    @pytest.mark.asyncio
    async def test_no_limit_configured_does_not_raise(self, db_session: AsyncSession):
        """Если max_visits_per_month не задан — проверка пропускается."""
        org = Organization(
            name="No Limit Org",
            slug="no-limit-org",
            plan="enterprise",
            plan_limits={},  # лимит не задан
            is_active=True,
        )
        db_session.add(org)
        await db_session.flush()

        # Не должно бросить исключение
        await check_visits_monthly_limit(db_session, org.id)

    @pytest.mark.asyncio
    async def test_within_limit_does_not_raise(
        self, db_session: AsyncSession, test_org: Organization, test_user: User
    ):
        """Если визитов меньше лимита — исключений нет."""
        # test_org имеет max_visits_per_month=100, визитов 0
        await check_visits_monthly_limit(db_session, test_org.id)

    @pytest.mark.asyncio
    async def test_at_limit_raises_403(
        self, db_session: AsyncSession, test_user: User
    ):
        """При достижении лимита бросает HTTPException 403."""
        org = Organization(
            name="Limit Org",
            slug="limit-org",
            plan="free",
            plan_limits={"max_visits_per_month": 2},
            is_active=True,
        )
        db_session.add(org)
        await db_session.flush()

        company = Company(
            name="Limit Company",
            region="Москва",
            organization_id=org.id,
        )
        db_session.add(company)
        await db_session.flush()

        # Пользователь в этой орг
        user = User(
            email="limituser@example.com",
            organization_id=org.id,
            role="user",
            is_active=True,
        )
        user.set_password("LimitPass1")
        db_session.add(user)
        await db_session.flush()

        # Добавляем 2 визита (== лимит)
        for _ in range(2):
            visit = Visit(
                company_id=company.id,
                user_id=user.id,
                organization_id=org.id,
                date=datetime.now(timezone.utc),
                status="planned",
            )
            db_session.add(visit)

        await db_session.flush()

        with pytest.raises(HTTPException) as exc_info:
            await check_visits_monthly_limit(db_session, org.id)

        assert exc_info.value.status_code == 403
        assert "лимит визитов" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_old_visits_not_counted(
        self, db_session: AsyncSession
    ):
        """Визиты из прошлых месяцев не учитываются в текущем лимите."""
        from datetime import timedelta
        org = Organization(
            name="Old Visits Org",
            slug="old-visits-org",
            plan="free",
            plan_limits={"max_visits_per_month": 1},  # лимит 1 визит
            is_active=True,
        )
        db_session.add(org)
        await db_session.flush()

        company = Company(
            name="Old Visits Company",
            region="Москва",
            organization_id=org.id,
        )
        db_session.add(company)
        await db_session.flush()

        user = User(
            email="oldvisits@example.com",
            organization_id=org.id,
            role="user",
            is_active=True,
        )
        user.set_password("OldPass123")
        db_session.add(user)
        await db_session.flush()

        # Визит из прошлого месяца
        old_date = datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)
        old_visit = Visit(
            company_id=company.id,
            user_id=user.id,
            organization_id=org.id,
            date=old_date,
            status="done",
        )
        db_session.add(old_visit)
        await db_session.flush()

        # Лимит 1, но визит прошлого месяца — не должно бросить
        await check_visits_monthly_limit(db_session, org.id)


# ─── check_users_limit ────────────────────────────────────────────────────────

class TestCheckUsersLimit:

    @pytest.mark.asyncio
    async def test_nonexistent_org_does_not_raise(self, db_session: AsyncSession):
        """Несуществующая организация — нет исключений."""
        await check_users_limit(db_session, org_id=888888)

    @pytest.mark.asyncio
    async def test_no_limit_does_not_raise(self, db_session: AsyncSession):
        """Если max_users не задан — проверка пропускается."""
        org = Organization(
            name="No User Limit Org",
            slug="no-user-limit",
            plan="enterprise",
            plan_limits={},
            is_active=True,
        )
        db_session.add(org)
        await db_session.flush()

        await check_users_limit(db_session, org.id)

    @pytest.mark.asyncio
    async def test_within_users_limit_does_not_raise(
        self, db_session: AsyncSession, test_org: Organization, test_user: User
    ):
        """test_org имеет max_users=5, пользователей 1 — OK."""
        await check_users_limit(db_session, test_org.id)

    @pytest.mark.asyncio
    async def test_at_users_limit_raises_403(self, db_session: AsyncSession):
        """При достижении лимита пользователей → 403."""
        org = Organization(
            name="User Limit Org",
            slug="user-limit-org",
            plan="free",
            plan_limits={"max_users": 1},
            is_active=True,
        )
        db_session.add(org)
        await db_session.flush()

        user = User(
            email="onlyone@example.com",
            organization_id=org.id,
            role="org_admin",
            is_active=True,
        )
        user.set_password("OnlyOne123")
        db_session.add(user)
        await db_session.flush()

        # 1 пользователь == лимит (max_users=1) → должно бросить 403
        with pytest.raises(HTTPException) as exc_info:
            await check_users_limit(db_session, org.id)

        assert exc_info.value.status_code == 403


# ─── check_companies_limit ────────────────────────────────────────────────────

class TestCheckCompaniesLimit:

    @pytest.mark.asyncio
    async def test_nonexistent_org_does_not_raise(self, db_session: AsyncSession):
        """Несуществующая организация — нет исключений."""
        await check_companies_limit(db_session, org_id=777777)

    @pytest.mark.asyncio
    async def test_no_limit_does_not_raise(self, db_session: AsyncSession):
        """Если max_companies не задан — проверка пропускается."""
        org = Organization(
            name="No Company Limit Org",
            slug="no-company-limit",
            plan="enterprise",
            plan_limits={},
            is_active=True,
        )
        db_session.add(org)
        await db_session.flush()

        await check_companies_limit(db_session, org.id)

    @pytest.mark.asyncio
    async def test_at_companies_limit_raises_403(self, db_session: AsyncSession):
        """При достижении лимита компаний → 403."""
        org = Organization(
            name="Company Limit Org",
            slug="company-limit-org",
            plan="free",
            plan_limits={"max_companies": 1},
            is_active=True,
        )
        db_session.add(org)
        await db_session.flush()

        company = Company(
            name="Only Company",
            region="Москва",
            organization_id=org.id,
        )
        db_session.add(company)
        await db_session.flush()

        # 1 компания == лимит → должно бросить 403
        with pytest.raises(HTTPException) as exc_info:
            await check_companies_limit(db_session, org.id)

        assert exc_info.value.status_code == 403
        assert "лимит компаний" in exc_info.value.detail.lower()
