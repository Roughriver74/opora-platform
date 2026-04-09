from typing import List, Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    bitrix_user_id: int
    is_active: bool = True
    is_admin: bool = False
    regions: Optional[List[str]] = []


# Определяем Pydantic-модель для обновления пользователя
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    bitrix_user_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    regions: Optional[List[str]] = None
