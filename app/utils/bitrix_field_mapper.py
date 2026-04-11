"""
Utility for mapping semantic field keys to Bitrix24 field IDs using FormTemplate.
Used by all entity services (contacts, doctors, network clinics, clinics, visits)
to avoid hardcoded UF_CRM_* field IDs.
"""
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FormTemplate


async def get_field_mapping(
    session: AsyncSession,
    organization_id: int,
    entity_type: str,
) -> Tuple[Dict[str, str], Dict[str, list], List[dict]]:
    """
    Load FormTemplate for an entity type and return mapping dicts.

    Returns:
        field_mapping_dict: {semantic_key: bitrix_field_id}
        list_field_mappings: {semantic_key: bitrix_value_mapping_list}
        template_fields: raw list of field definitions
    """
    template = (
        await session.execute(
            select(FormTemplate).where(
                FormTemplate.entity_type == entity_type,
                FormTemplate.organization_id == organization_id,
            )
        )
    ).scalars().first()

    template_fields = template.fields if template and template.fields else []

    field_mapping_dict = {
        f["key"]: f["bitrix_field_id"]
        for f in template_fields
        if f.get("bitrix_field_id")
    }

    list_field_mappings = {
        f["key"]: f["bitrix_value_mapping"]
        for f in template_fields
        if f.get("bitrix_field_type") == "list" and f.get("bitrix_value_mapping")
    }

    return field_mapping_dict, list_field_mappings, template_fields


def map_to_bitrix(
    data: Dict[str, Any],
    field_mapping_dict: Dict[str, str],
    list_field_mappings: Optional[Dict[str, list]] = None,
) -> Dict[str, Any]:
    """
    Map semantic field keys to Bitrix24 field IDs.

    Args:
        data: dict with semantic keys (e.g. {"inn": "1234567890", "address": "..."})
        field_mapping_dict: {semantic_key: bitrix_field_id}
        list_field_mappings: {semantic_key: [{app_value, bitrix_value}, ...]}

    Returns:
        dict with Bitrix24 field IDs as keys
    """
    result = {}
    list_mappings = list_field_mappings or {}

    for key, value in data.items():
        bitrix_id = field_mapping_dict.get(key, key)

        # Map list values if mapping exists
        if key in list_mappings and list_mappings[key]:
            for option in list_mappings[key]:
                if option.get("app_value") == value:
                    value = option.get("bitrix_value", value)
                    break

        result[bitrix_id] = value

    return result


def map_from_bitrix(
    bitrix_data: Dict[str, Any],
    field_mapping_dict: Dict[str, str],
) -> Dict[str, Any]:
    """
    Map Bitrix24 field IDs back to semantic keys.
    Inverse of map_to_bitrix.
    """
    # Build reverse mapping
    reverse_mapping = {v: k for k, v in field_mapping_dict.items()}

    result = {}
    for key, value in bitrix_data.items():
        semantic_key = reverse_mapping.get(key, key)
        result[semantic_key] = value

    return result
