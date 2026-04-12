import json
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
