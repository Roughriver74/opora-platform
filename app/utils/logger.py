"""
Structured JSON logging для OPORA Platform.
Каждая запись — валидный JSON с полями: timestamp, level, message, request_id, extra.
"""
import asyncio
import json
import logging
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime
from functools import wraps
from typing import Any

# Context variable для Request ID (прокидывается через middleware)
request_id_var: ContextVar[str] = ContextVar("request_id", default="")

# PII поля, которые маскируем в логах
_PII_FIELDS = {"password", "token", "secret", "authorization", "api_key", "webhook_url"}


def _mask_pii(data: Any, depth: int = 0) -> Any:
    """Рекурсивно маскирует PII поля в dict/list."""
    if depth > 5:
        return data
    if isinstance(data, dict):
        return {
            k: "***" if k.lower() in _PII_FIELDS else _mask_pii(v, depth + 1)
            for k, v in data.items()
        }
    if isinstance(data, list):
        return [_mask_pii(item, depth + 1) for item in data]
    return data


class JsonFormatter(logging.Formatter):
    """Форматирует лог-записи как JSON строки."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "request_id": request_id_var.get(""),
        }

        # Добавляем extra поля если есть
        if hasattr(record, "extra"):
            log_entry["extra"] = _mask_pii(record.extra)

        # Добавляем exc_info если есть
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False)


def _get_logger(name: str = "opora") -> logging.Logger:
    """Возвращает настроенный JSON logger."""
    _logger = logging.getLogger(name)

    if not _logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        _logger.addHandler(handler)
        _logger.setLevel(logging.INFO)
        _logger.propagate = False

    return _logger


# Глобальный инстанс
app_logger = _get_logger("opora")


# ---------------------------------------------------------------------------
# Вспомогательные функции для прямого логирования
# ---------------------------------------------------------------------------

def log_info(message: str, **extra):
    app_logger.info(message, extra={"extra": extra} if extra else {})


def log_error(message: str, exc: Exception = None, **extra):
    app_logger.error(message, exc_info=exc, extra={"extra": extra} if extra else {})


def log_warning(message: str, **extra):
    app_logger.warning(message, extra={"extra": extra} if extra else {})


# ---------------------------------------------------------------------------
# Декоратор @logger()
# ---------------------------------------------------------------------------

def logger(skip_args: bool = False):
    """
    Декоратор для логирования вызовов функций.
    Логирует начало, конец и ошибки.
    Совместим с @logger() на async- и sync-функциях.
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            fn_name = f"{func.__module__}.{func.__qualname__}"
            req_id = request_id_var.get("")

            app_logger.debug(
                f"-> {fn_name}",
                extra={"extra": {"request_id": req_id}},
            )
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                app_logger.error(
                    f"Error in {fn_name}: {type(e).__name__}: {e}",
                    exc_info=True,
                    extra={"extra": {"request_id": req_id}},
                )
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            fn_name = f"{func.__module__}.{func.__qualname__}"
            try:
                return func(*args, **kwargs)
            except Exception as e:
                app_logger.error(
                    f"Error in {fn_name}: {type(e).__name__}: {e}",
                    exc_info=True,
                )
                raise

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


# ---------------------------------------------------------------------------
# Обратная совместимость: setup_logger() вызывается в main.py on_startup
# ---------------------------------------------------------------------------

async def setup_logger():
    """
    Заглушка для обратной совместимости.
    Новый логгер инициализируется при импорте модуля; явная настройка не нужна.
    """
    return app_logger
