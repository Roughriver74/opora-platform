from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings as settings
from app.models import User
from app.services.bitrix24 import Bitrix24Client, require_bitrix24
from app.utils.logger import logger

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
        bitrix = require_bitrix24(self.bitrix24)
        bitrix_user = await bitrix.get_user_by_email(email)
        if not bitrix_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found in Bitrix24 system",
            )
        existing_user = await self.get_single_user_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        user = User(email=email, bitrix_user_id=bitrix_user["ID"])
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
