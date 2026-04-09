import json
from typing import List, Optional

from pydantic import BaseModel, Field, validator


class CustomSectionBase(BaseModel):
    section_id: str = Field(..., description="Unique identifier for the section")
    name: str = Field(..., description="Name of the section")
    order: int = Field(default=0, description="Order of the section")
    fields: Optional[List[str]] = Field(
        default=[], description="List of field IDs in this section"
    )

    @validator("section_id")
    def validate_section_id(cls, v):
        if not v or not isinstance(v, str) or len(v.strip()) == 0:
            raise ValueError("section_id не может быть пустым")
        return v.strip()

    @validator("name")
    def validate_name(cls, v):
        if not v or not isinstance(v, str) or len(v.strip()) == 0:
            raise ValueError("name не может быть пустым")
        return v.strip()

    @validator("fields", pre=True)
    def validate_fields(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            # Фильтруем None и пустые строки
            return [
                str(field)
                for field in v
                if field is not None and str(field).strip() != ""
            ]
        if isinstance(v, str):
            try:
                # Пробуем распарсить JSON строку
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [
                        str(field)
                        for field in parsed
                        if field is not None and str(field).strip() != ""
                    ]
            except:
                pass
        # Если не список и не JSON строка, возвращаем пустой список
        return []


class CustomSectionCreate(CustomSectionBase):
    pass


class CustomSectionUpdate(CustomSectionBase):
    pass


class CustomSection(CustomSectionBase):
    id: int

    class Config:
        orm_mode = True


class CustomSectionList(BaseModel):
    sections: List[CustomSection]
