from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import Settings as s

sql_link = (
    f"postgresql+asyncpg://{s.POSTGRES_USER}:{s.POSTGRES_PASSWORD}@{s.POSTGRES_HOST}"
    f":{s.POSTGRES_PORT}/{s.POSTGRES_DB}"
)
engine = create_async_engine(
    sql_link,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True,
    pool_timeout=30,
)

SessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, class_=AsyncSession, bind=engine
)
