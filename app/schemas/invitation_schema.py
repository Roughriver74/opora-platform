from typing import Optional

from pydantic import BaseModel, EmailStr


class CreateInvitation(BaseModel):
    email: EmailStr
    role: str = "user"


class InvitationResponse(BaseModel):
    id: int
    email: str
    role: str
    token: str
    accepted_at: Optional[str] = None
    expires_at: str

    class Config:
        from_attributes = True
