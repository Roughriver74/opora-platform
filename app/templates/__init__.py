import copy
import json
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent

_templates_cache: dict | None = None


def load_templates() -> dict:
    """Загрузить все шаблоны из JSON-файлов."""
    global _templates_cache
    if _templates_cache is None:
        templates = {}
        for file in TEMPLATES_DIR.glob("*.json"):
            with open(file, "r", encoding="utf-8") as f:
                template = json.load(f)
                template_id = template.get("id")
                if template_id:
                    templates[template_id] = template
        _templates_cache = templates
    return dict(_templates_cache)


def get_template(template_id: str) -> dict | None:
    """Получить шаблон по ID."""
    t = load_templates().get(template_id)
    return copy.deepcopy(t) if t is not None else None


def list_templates() -> list[dict]:
    """Список всех шаблонов (id, name, description, icon)."""
    return sorted(
        [
            {
                "id": t["id"],
                "name": t["name"],
                "description": t["description"],
                "icon": t["icon"],
            }
            for t in load_templates().values()
        ],
        key=lambda x: x["id"],
    )


def _clear_cache() -> None:
    """Reset the in-process cache. Intended for testing only."""
    global _templates_cache
    _templates_cache = None
