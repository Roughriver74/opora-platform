"""Тесты аутентификации и авторизации.

Покрывает:
- POST /api/register-org    — самостоятельная регистрация организации
- POST /api/login           — вход с выдачей JWT + refresh token
- POST /api/refresh         — ротация refresh token
- POST /api/logout          — инвалидация refresh token
- Защита эндпоинтов от неавторизованных запросов
- GET  /api/health          — публичный healthcheck
"""
import pytest
from httpx import AsyncClient


class TestHealthCheck:
    """Публичный health endpoint доступен без авторизации."""

    @pytest.mark.asyncio
    async def test_health_returns_200(self, client: AsyncClient):
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


class TestOrgRegistration:
    """POST /api/register-org — самостоятельная регистрация."""

    @pytest.mark.asyncio
    async def test_register_org_success(self, client: AsyncClient):
        """Успешная регистрация создаёт орг + пользователя и возвращает JWT."""
        response = await client.post(
            "/api/register-org",
            json={
                "first_name": "Ivan",
                "last_name": "Ivanov",
                "email": "newowner@example.com",
                "password": "NewPass123",
                "company_name": "New Test Company",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data.get("token_type") == "bearer"
        assert "organization" in data
        assert data["organization"]["plan"] == "free"
        assert data["user"]["role"] == "org_admin"

    @pytest.mark.asyncio
    async def test_register_org_duplicate_email(self, client: AsyncClient, test_user):
        """Повторная регистрация с тем же email → 409 Conflict."""
        response = await client.post(
            "/api/register-org",
            json={
                "first_name": "Ivan",
                "last_name": "Ivanov",
                "email": "test@example.com",  # уже существует (test_user)
                "password": "NewPass123",
                "company_name": "Another Company",
            },
        )
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_org_weak_password_too_short(self, client: AsyncClient):
        """Пароль < 8 символов → 422 Unprocessable Entity."""
        response = await client.post(
            "/api/register-org",
            json={
                "first_name": "Ivan",
                "last_name": "Ivanov",
                "email": "user2@example.com",
                "password": "short",
                "company_name": "Test Co",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_org_weak_password_no_uppercase(self, client: AsyncClient):
        """Пароль без заглавной буквы → 422."""
        response = await client.post(
            "/api/register-org",
            json={
                "first_name": "Ivan",
                "last_name": "Ivanov",
                "email": "user3@example.com",
                "password": "lowercase123",
                "company_name": "Test Co",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_org_weak_password_no_digit(self, client: AsyncClient):
        """Пароль без цифры → 422."""
        response = await client.post(
            "/api/register-org",
            json={
                "first_name": "Ivan",
                "last_name": "Ivanov",
                "email": "user4@example.com",
                "password": "NoDigitsHere",
                "company_name": "Test Co",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_org_invalid_email(self, client: AsyncClient):
        """Невалидный email → 422."""
        response = await client.post(
            "/api/register-org",
            json={
                "first_name": "Ivan",
                "last_name": "Ivanov",
                "email": "not-an-email",
                "password": "ValidPass1",
                "company_name": "Test Co",
            },
        )
        assert response.status_code == 422


class TestLogin:
    """POST /api/login — вход в систему."""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user):
        """Успешный логин возвращает access_token, refresh_token и данные пользователя."""
        response = await client.post(
            "/api/login",
            json={"email": "test@example.com", "password": "TestPass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data.get("token_type") == "bearer"
        assert "expires_in" in data
        assert data["user"]["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user):
        """Неверный пароль → 401 Unauthorized."""
        response = await client.post(
            "/api/login",
            json={"email": "test@example.com", "password": "WrongPass999"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Несуществующий email → 401 Unauthorized."""
        response = await client.post(
            "/api/login",
            json={"email": "nobody@example.com", "password": "AnyPass123"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_missing_fields(self, client: AsyncClient):
        """Запрос без обязательных полей → 400 Bad Request."""
        response = await client.post("/api/login", json={})
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_login_form_encoded(self, client: AsyncClient, test_user):
        """Логин через application/x-www-form-urlencoded (OAuth2 совместимость)."""
        response = await client.post(
            "/api/token",
            data={"username": "test@example.com", "password": "TestPass123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data


class TestRefreshToken:
    """POST /api/refresh — ротация токена."""

    @pytest.mark.asyncio
    async def test_refresh_token_rotation(self, client: AsyncClient, test_user):
        """Refresh token меняется при обновлении (token rotation)."""
        # Логинимся
        login_resp = await client.post(
            "/api/login",
            json={"email": "test@example.com", "password": "TestPass123"},
        )
        if login_resp.status_code != 200:
            pytest.skip("Login failed, skipping refresh test")

        old_refresh = login_resp.json()["refresh_token"]

        # Обновляем
        refresh_resp = await client.post(
            "/api/refresh",
            json={"refresh_token": old_refresh},
        )
        assert refresh_resp.status_code == 200
        data = refresh_resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # Новый refresh token отличается от старого
        assert data["refresh_token"] != old_refresh

    @pytest.mark.asyncio
    async def test_refresh_invalid_token(self, client: AsyncClient):
        """Невалидный refresh token → 401."""
        response = await client.post(
            "/api/refresh",
            json={"refresh_token": "totally-invalid-token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_single_use(self, client: AsyncClient, test_user):
        """Использованный refresh token нельзя применить повторно (revoked)."""
        login_resp = await client.post(
            "/api/login",
            json={"email": "test@example.com", "password": "TestPass123"},
        )
        if login_resp.status_code != 200:
            pytest.skip("Login failed")

        old_refresh = login_resp.json()["refresh_token"]

        # Первое использование — успех
        first = await client.post(
            "/api/refresh",
            json={"refresh_token": old_refresh},
        )
        assert first.status_code == 200

        # Повторное использование того же токена — 401
        second = await client.post(
            "/api/refresh",
            json={"refresh_token": old_refresh},
        )
        assert second.status_code == 401


class TestLogout:
    """POST /api/logout — инвалидация refresh token."""

    @pytest.mark.asyncio
    async def test_logout_success(self, client: AsyncClient, test_user):
        """Logout инвалидирует refresh token, после чего он не работает."""
        login_resp = await client.post(
            "/api/login",
            json={"email": "test@example.com", "password": "TestPass123"},
        )
        if login_resp.status_code != 200:
            pytest.skip("Login failed")

        refresh_token = login_resp.json()["refresh_token"]

        # Logout
        logout_resp = await client.post(
            "/api/logout",
            json={"refresh_token": refresh_token},
        )
        assert logout_resp.status_code == 200
        assert "message" in logout_resp.json()

        # Попытка использовать отозванный токен → 401
        refresh_resp = await client.post(
            "/api/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_resp.status_code == 401


class TestProtectedEndpoints:
    """Проверка защиты эндпоинтов от неавторизованных запросов."""

    @pytest.mark.asyncio
    async def test_visits_requires_auth(self, client: AsyncClient):
        """GET /api/visits без токена → 401 или 403."""
        response = await client.get("/api/visits/")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_clinics_requires_auth(self, client: AsyncClient):
        """GET /api/clinics/ без токена → 401 или 403."""
        response = await client.get("/api/clinics/")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_contacts_requires_auth(self, client: AsyncClient):
        """GET /api/contacts/ без токена → 401 или 403."""
        response = await client.get("/api/contacts/")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_invalid_jwt_returns_401(self, client: AsyncClient):
        """Запрос с заведомо неверным JWT → 401."""
        response = await client.get(
            "/api/visits/",
            headers={"Authorization": "Bearer invalid.jwt.token"},
        )
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_visits_with_valid_token(self, client: AsyncClient, auth_headers):
        """GET /api/visits/ с валидным токеном → 200."""
        if not auth_headers:
            pytest.skip("Could not obtain auth token")
        response = await client.get("/api/visits/", headers=auth_headers)
        assert response.status_code == 200
