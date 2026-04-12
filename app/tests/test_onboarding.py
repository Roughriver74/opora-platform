import pytest

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
    assert t is not None
    assert len(t["form_template"]["fields"]) == 1
    assert len(t["checklist"]["items"]) == 0


@pytest.mark.parametrize("template_id", ["cleaning", "service", "audit", "sales", "blank"])
def test_all_templates_have_required_keys(template_id):
    t = get_template(template_id)
    assert t is not None
    for key in ("form_template", "checklist", "statuses", "status_labels", "role_labels", "dashboard_metrics"):
        assert key in t, f"{template_id} missing key: {key}"
