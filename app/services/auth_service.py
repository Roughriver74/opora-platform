import secrets
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings as settings
from app.models import RefreshToken, User
from app.services.bitrix24 import Bitrix24Client, require_bitrix24
from app.utils.logger import logger

REFRESH_TOKEN_TTL_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class AuthService:
    def __init__(self, session: AsyncSession, bitrix24: Bitrix24Client):
        self.session = session
        self.bitrix24 = bitrix24

    @logger()
    async def get_single_user_by_email(self, email: str) -> Optional[User]:
        return (
            (await self.session.execute(select(User).where(User.email == email)))
            .scalars()
            .first()
        )

    @logger()
    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = await self.get_single_user_by_email(email)
        if not user or not user.verify_password(password):
            return None
        return user

    @logger()
    async def register_user(self, email: str, password: str) -> User:
        existing_user = await self.get_single_user_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        bitrix_user_id = None
        if self.bitrix24 is not None:
            bitrix_user = await self.bitrix24.get_user_by_email(email)
            if bitrix_user:
                bitrix_user_id = bitrix_user["ID"]

        user = User(email=email, bitrix_user_id=bitrix_user_id)
        user.set_password(password)

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    @staticmethod
    async def create_access_token(
        data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    @logger()
    async def get_current_user(self, token: str = Depends(oauth2_scheme)) -> User:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        user = await self.get_single_user_by_email(email)
        if user is None:
            raise credentials_exception
        return user

    @logger()
    async def get_current_active_admin_user(
        self, token: str = Depends(oauth2_scheme)
    ) -> User:
        user = await self.get_current_user(token)
        if not user.is_org_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return user

    async def create_refresh_token(self, user_id: int, org_id: int = None) -> str:
        """Создаёт refresh token и сохраняет в БД. Возвращает строку токена."""
        token = secrets.token_urlsafe(64)
        expires_at = datetime.now(ZoneInfo("Europe/Moscow")) + timedelta(days=REFRESH_TOKEN_TTL_DAYS)

        refresh_token = RefreshToken(
            token=token,
            user_id=user_id,
            organization_id=org_id,
            expires_at=expires_at,
            revoked=False,
        )
        self.session.add(refresh_token)
        await self.session.flush()
        return token

    async def validate_refresh_token(self, token: str) -> Optional[RefreshToken]:
        """Валидирует refresh token. Возвращает объект RefreshToken или None."""
        now = datetime.now(ZoneInfo("Europe/Moscow"))
        result = await self.session.execute(
            select(RefreshToken)
            .where(RefreshToken.token == token)
            .where(RefreshToken.revoked == False)  # noqa: E712
            .where(RefreshToken.expires_at > now)
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token: str) -> None:
        """Отзывает refresh token по значению токена."""
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.token == token)
            .values(revoked=True)
        )
