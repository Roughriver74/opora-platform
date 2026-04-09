from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, field_serializer


class FieldMappingBase(BaseModel):
    entity_type: str
    app_field_name: str
    bitrix_field_id: str
    field_type: str
    is_required: bool = False
    display_name: str
    value_options: Any = None
    is_multiple: Optional[bool] = (
        False  # Флаг, показывающий, что поле поддерживает множественный выбор
    )
    show_in_card: Optional[bool] = (
        False  # Флаг, показывающий, что поле должно отображаться на карточке
    )
    sort_order: Optional[int] = (
        100  # Порядок сортировки полей в форме, по умолчанию 100
    )
    entity_type_id: Optional[int] = None

    @field_serializer("value_options")
    def serialize_value_options(self, value_options: Optional[dict]) -> Optional[str]:
        """
        Преобразует value_options в строку перед сериализацией.
        Если значение None, оно остается None.
        """
        if value_options is None:
            return None
        return str(value_options)


class FieldMappingResponse(FieldMappingBase):
    id: int
    entity_type_id: Optional[int] = None

    model_config = {"from_attributes": True}


class GlobalSettingBase(BaseModel):
    key: str
    value: str
    description: str = None


class GlobalSettingCreate(GlobalSettingBase):
    pass


class GlobalSettingResponse(GlobalSettingBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @staticmethod
    def serialize_datetime(value: Optional[datetime]) -> Optional[str]:
        """Преобразует datetime в строку ISO формата."""
        return value.isoformat() if value else None

    def model_dump(self, **kwargs) -> dict:
        """Переопределяем метод model_dump для преобразования datetime."""
        data = super().model_dump(**kwargs)
        data["created_at"] = self.serialize_datetime(data.get("created_at"))
        data["updated_at"] = self.serialize_datetime(data.get("updated_at"))
        return data
