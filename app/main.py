from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.utils.logger import setup_logger
from app.utils.rate_limit import limiter

from app.config import Settings
from app.middleware import catch_exceptions_middleware, request_id_middleware
from app.routers import (
    admin_routers,
    analytics_routers,
    audit_routers,
    auth_routers,
    billing_routers,
    clinic_routers,
    contacts_routers,
    custom_sections_routers,
    dadata_router,
    form_template_routers,
    help_routers,
    invitation_routers,
    network_clinic_routers,
    platform_routers,
    profile_service,
    regions_routers,
    settings_routers,
    tasks_routers,
    users_routers,
    visit_form_routers,
    visit_routers,
)
from app.schedulers.import_companies_from_excel import scheduler

load_dotenv()

app = FastAPI(
    title="OPORA Platform API",
    redirect_slashes=False,
    on_startup=[
        scheduler.start,
    ],
    on_shutdown=[
        scheduler.shutdown,
    ],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Prometheus метрики — настраивается ДО middleware
instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    excluded_handlers=["/api/health", "/metrics"],
)
instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

# Request ID middleware — должен быть первым, чтобы request_id был доступен везде
app.middleware("http")(request_id_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=Settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Request-ID",
        "X-API-Key",
        "Accept",
        "Origin",
    ],
    expose_headers=["X-Request-ID"],
    max_age=600,
)

api_prefix = "/api"

# Include routers
app.include_router(auth_routers.router, prefix=api_prefix, tags=["Авторизация"])
app.include_router(
    clinic_routers.router, prefix=f"{api_prefix}/clinics", tags=["Компании"]
)
app.include_router(visit_routers.router, prefix=f"{api_prefix}/visits", tags=["Визиты"])
app.include_router(
    contacts_routers.router, prefix=f"{api_prefix}/contacts", tags=["Контакты"]
)
app.include_router(profile_service.router, prefix=api_prefix, tags=["Пользователи"])
app.include_router(
    admin_routers.router, prefix=f"{api_prefix}/admin", tags=["Администрирование"]
)
app.include_router(users_routers.router, prefix=api_prefix, tags=["Пользователи"])
app.include_router(custom_sections_routers.router, prefix=api_prefix, tags=["Секции"])
app.include_router(regions_routers.router, prefix=api_prefix, tags=["Регионы"])
app.include_router(
    settings_routers.router, prefix=f"{api_prefix}/settings", tags=["Настройки"]
)
app.include_router(
    network_clinic_routers.router,
    prefix=f"{api_prefix}/network-clinics",
    tags=["Филиалы"],
)
app.include_router(
    dadata_router.router,
    prefix=f"{api_prefix}/dadata",
    tags=["Обработка адреса компаний"],
)

app.include_router(tasks_routers.router, prefix=f"{api_prefix}/tasks", tags=["Задачи"])
app.include_router(
    platform_routers.router,
    prefix=f"{api_prefix}/platform",
    tags=["Платформа (admin)"],
)
app.include_router(
    invitation_routers.router,
    prefix=f"{api_prefix}/invitations",
    tags=["Приглашения"],
)
app.include_router(
    billing_routers.router,
    prefix=f"{api_prefix}/billing",
    tags=["Биллинг"],
)
app.include_router(
    help_routers.router,
    prefix=f"{api_prefix}/help",
    tags=["Справка"],
)
app.include_router(
    visit_form_routers.router,
    prefix=f"{api_prefix}/visit-form",
    tags=["Шаблон формы визита"],
)
app.include_router(
    form_template_routers.router,
    prefix=api_prefix,
    tags=["Шаблоны форм"],
)
app.include_router(
    analytics_routers.router,
    prefix=api_prefix,
    tags=["Аналитика"],
)
app.include_router(
    audit_routers.router,
    prefix=api_prefix,
    tags=["Аудит"],
)


@app.get(f"{api_prefix}/health")
@app.head(f"{api_prefix}/health")
async def health_check():
    """Детальный health check — проверяет БД и Redis."""
    import time
    from sqlalchemy import text
    from app.database_session import engine
    from app.utils.cache import get_redis

    start = time.monotonic()
    checks = {}
    overall = "healthy"

    # Проверка PostgreSQL
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = {
            "status": "healthy",
            "latency_ms": round((time.monotonic() - start) * 1000),
        }
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}
        overall = "degraded"

    # Проверка Redis (опциональная, не критична)
    try:
        redis = await get_redis()
        if redis:
            await redis.ping()
            checks["redis"] = {"status": "healthy"}
        else:
            checks["redis"] = {"status": "disabled"}
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(e)}

    return {
        "status": overall,
        "version": "1.0.0",
        "environment": Settings.ENVIRONMENT,
        "checks": checks,
        "uptime_seconds": round(time.monotonic()),
    }


@app.on_event("startup")
async def init_models() -> None:
    await setup_logger()


catch_exceptions_middleware(app)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
