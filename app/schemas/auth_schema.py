from typing import Optional

from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class OrgRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    company_name: str


class AcceptInvite(BaseModel):
    token: str
    password: str
    first_name: str
    last_name: str


class UserResponse(BaseModel):
    email: EmailStr
    bitrix_user_id: Optional[int] = None
    role: str = "user"
    organization_id: Optional[int] = None
    regions: list[str] = []
