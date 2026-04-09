from datetime import timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app.config import Settings as settings
from app.schemas.auth_schema import Token, UserCreate, UserResponse
from app.services.uow import UnitOfWork, get_uow

router = APIRouter()


@router.post("/token", response_model=Token)
@router.post("/login", response_model=dict)
async def login_for_access_token(
    request: Request,
    data: Optional[Dict[str, Any]] = Body(None),
    form_data: OAuth2PasswordRequestForm = Depends(None),
    uow: UnitOfWork = Depends(get_uow),
) -> Any:
    # Если данные приходят в формате JSON (от фронтенда)
    if data and "email" in data and "password" in data:
        username = data["email"]
        password = data["password"]
    # Если данные приходят в формате формы (от Swagger UI)
    elif form_data:
        username = form_data.username
        password = form_data.password
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request format"
        )
    user = await uow.auth.authenticate_user(username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Добавляем информацию о правах администратора в JWT токен
    access_token = await uow.auth.create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin, "user_id": user.id},
        expires_delta=access_token_expires,
    )
    # Если это запрос на /login, возвращаем также информацию о пользователе
    if request.url.path.endswith("/login"):
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "is_admin": user.is_admin,
                "regions": user.regions or [],
            },
        }
    # Если это запрос на /token, возвращаем только токен
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, uow: UnitOfWork = Depends(get_uow)) -> Any:
    """
    Register a new user.
    The email must match a Bitrix24 user's email.
    """
    try:
        user = await uow.auth.register_user(user_in.email, user_in.password)
        return {"email": user.email, "bitrix_user_id": user.bitrix_user_id}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
