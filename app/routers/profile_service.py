from typing import Any

from fastapi import APIRouter, Depends

from app.models import User
from app.utils.utils import get_current_user

router = APIRouter()


@router.get("/profile", response_model=dict)
async def get_user_profile(current_user: User = Depends(get_current_user)) -> Any:
    """
    Get current user profile.
    """
    return {
        "email": current_user.email,
        "bitrix_user_id": current_user.bitrix_user_id,
        "id": current_user.id,
        "is_admin": (
            current_user.is_admin if hasattr(current_user, "is_admin") else False
        ),
    }
