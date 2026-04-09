from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    email: EmailStr
    bitrix_user_id: int
    regions: list[str] = []
