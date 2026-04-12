import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse

from app.utils.logger import app_logger, request_id_var


async def request_id_middleware(request: Request, call_next):
    """
    Генерирует уникальный Request ID и прокидывает его через ContextVar.
    Логирует входящий HTTP-запрос в structured JSON формате.
    Добавляет X-Request-ID в заголовки ответа.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    token = request_id_var.set(request_id)

    app_logger.info(
        f"{request.method} {request.url.path}",
        extra={
            "extra": {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None,
            }
        },
    )

    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        request_id_var.reset(token)


def catch_exceptions_middleware(app: FastAPI):
    @app.middleware("http")
    async def middleware(request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            return JSONResponse({"error": str(e.detail)}, status_code=e.status_code)
        except Exception as e:
            app_logger.error(
                f"Unhandled exception: {type(e).__name__}: {e}",
                exc_info=True,
                extra={"extra": {"path": request.url.path}},
            )
            return JSONResponse({"code": "ERROR", "errorText": str(e)}, status_code=500)
