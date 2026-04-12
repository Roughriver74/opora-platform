from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


def _validate_password_strength(v: str) -> str:
    """Общая проверка надёжности пароля для всех схем регистрации."""
    if len(v) < 8:
        raise ValueError("Пароль должен содержать минимум 8 символов")
    if not any(c.isupper() for c in v):
        raise ValueError("Пароль должен содержать хотя бы одну заглавную букву")
    if not any(c.isdigit() for c in v):
        raise ValueError("Пароль должен содержать хотя бы одну цифру")
    return v


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class OrgRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    company_name: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class AcceptInvite(BaseModel):
    token: str
    password: str
    first_name: str
    last_name: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class UserResponse(BaseModel):
    email: EmailStr
    bitrix_user_id: Optional[int] = None
    role: str = "user"
    organization_id: Optional[int] = None
    regions: list[str] = []
