import pytest

from app.templates import load_templates, get_template, list_templates, _clear_cache


@pytest.fixture(autouse=True)
def reset_template_cache():
    _clear_cache()
    yield
    _clear_cache()


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
    assert t is not None
    assert len(t["form_template"]["fields"]) == 1
    assert len(t["checklist"]["items"]) == 0


@pytest.mark.parametrize("template_id", ["cleaning", "service", "audit", "sales", "blank"])
def test_all_templates_have_required_keys(template_id):
    t = get_template(template_id)
    assert t is not None
    for key in ("form_template", "checklist", "statuses", "status_labels", "role_labels", "dashboard_metrics"):
        assert key in t, f"{template_id} missing key: {key}"


@pytest.mark.asyncio
async def test_setup_organization_with_template(client, admin_headers):
    """Применение шаблона создаёт FormTemplate и обновляет настройки организации."""
    response = await client.post(
        "/api/onboarding/setup",
        json={
            "template_id": "cleaning",
            "company_name": "Тест Клининг",
            "team_size": "1-5",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["template_applied"] == "cleaning"
    assert data["form_fields_count"] > 0
    assert data["checklist_items_count"] > 0


@pytest.mark.asyncio
async def test_setup_with_invalid_template(client, admin_headers):
    """Несуществующий шаблон → 404."""
    response = await client.post(
        "/api/onboarding/setup",
        json={
            "template_id": "nonexistent",
            "company_name": "Test",
            "team_size": "1-5",
        },
        headers=admin_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_setup_requires_org_admin(client, auth_headers):
    """Обычный пользователь (не org_admin) получает 403."""
    response = await client.post(
        "/api/onboarding/setup",
        json={"template_id": "cleaning", "company_name": "Test", "team_size": "1-5"},
        headers=auth_headers,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_templates_endpoint(client):
    """GET /api/onboarding/templates возвращает список шаблонов."""
    response = await client.get("/api/onboarding/templates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    assert all("id" in t and "name" in t for t in data)
