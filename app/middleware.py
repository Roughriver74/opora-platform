import time
import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.responses import JSONResponse


def catch_exceptions_middleware(app: FastAPI):
    @app.middleware("http")
    async def middleware(request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            return JSONResponse({"error": str(e.detail)}, status_code=e.status_code)
        except Exception as e:
            return JSONResponse({"code": "ERROR", "errorText": str(e)}, status_code=500)


class LogBuffer:
    """Класс для хранения логов, которые будут записаны в файл по завершению метода."""

    def __init__(self):
        self.logs = []

    def add_log(self, level, message):
        self.logs.append((level, message))

    def clear(self):
        self.logs = []


async def log_to_file(logger, logs):
    """Асинхронная запись всех логов в файл одним вызовом."""
    for log in logs:
        if log[0] == "info":
            await logger.info(log[1])
        else:
            await logger.error(log[1])


def logging_middleware(app: FastAPI):
    @app.middleware("http")
    async def middleware(request: Request, call_next):
        from app.utils.logger import logger

        log_buffer = LogBuffer()
        start_time = time.time()

        log_buffer.add_log("info", f"Request received: {request.method} {request.url}")
        log_buffer.add_log("info", f"Request headers: {dict(request.headers)}")

        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.json()
                log_buffer.add_log("info", f"Request body: {body}")
            except Exception as e:
                log_buffer.add_log("error", f"Error reading request body: {str(e)}")

        try:
            response = await call_next(request)

            log_buffer.add_log("info", f"Response status: {response.status_code}")

        except Exception as e:
            error_trace = traceback.format_exc()
            log_buffer.add_log("error", f"Ошибка:\n {error_trace}")
            raise
        finally:
            execution_time = time.time() - start_time
            log_buffer.add_log(
                "info", f"Request completed in {execution_time:.4f} seconds\n\n"
            )
            await log_to_file(logger, log_buffer.logs)
            log_buffer.clear()

        return response
