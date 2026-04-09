import asyncio
import functools
import logging
import os
import shutil
import traceback
from typing import Callable, Union

import aiofiles
from aiologger import Logger
from aiologger.handlers.files import AsyncFileHandler
from fastapi import UploadFile


class CustomFormatter(logging.Formatter):
    def format(self, record):
        record.message = record.get_message()
        if self.usesTime():
            record.asctime = self.formatTime(record, self.datefmt)
        s = self.formatMessage(record)
        if record.exc_info:
            if not record.exc_text:
                record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            if s[-1:] != "\n":
                s = s + "\n"
            s = s + record.exc_text
        if record.stack_info:
            if s[-1:] != "\n":
                s = s + "\n"
            s = s + self.formatStack(record.stack_info)
        return s


logger_log = None


async def setup_logger():
    global logger_log
    if logger_log is None:  # Убедитесь, что логгер уже не инициализирован
        logger_log = Logger(name="visits")
        current_directory = os.getcwd()
        log_directory = os.path.join(current_directory, "logs")
        log_path = os.path.join(log_directory, "app_logger.log")

        os.makedirs(log_directory, exist_ok=True)

        rotating_handler = RotatingAsyncFileHandler(
            filename=log_path, max_bytes=20 * 1024 * 1024, backup_count=10
        )
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        date_format = "%Y-%m-%d %H:%M:%S"
        formatter = CustomFormatter(fmt=log_format, datefmt=date_format)
        rotating_handler.formatter = formatter
        logger_log.add_handler(rotating_handler)

    return logger_log


class RotatingAsyncFileHandler(AsyncFileHandler):
    def __init__(self, filename, max_bytes=1 * 1024 * 1024, backup_count=10, **kwargs):
        super().__init__(filename=filename, **kwargs)
        self.filename = filename
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self._lock = asyncio.Lock()

    async def emit(self, record):
        async with self._lock:
            # Проверяем ротацию
            if await self._rotate_logs_if_needed():
                if self.stream:
                    await self.stream.flush()
                    await asyncio.to_thread(os.fsync, self.stream.fileno())
                return

            # Пишем лог
            await super().emit(record)

            # Счётчик для периодического fsync
            self._write_count = getattr(self, "_write_count", 0) + 1

            if self.stream and self._write_count % 50 == 0:
                await self.stream.flush()
                await asyncio.to_thread(os.fsync, self.stream.fileno())

    async def _rotate_logs_if_needed(self):
        if (
            os.path.exists(self.filename)
            and os.path.getsize(self.filename) >= self.max_bytes
        ):
            await self._rotate_logs()

    async def _rotate_logs(self):
        if self.backup_count > 0:
            # Разделяем имя файла и расширение
            base_name, ext = os.path.splitext(self.filename)

            # Удаляем самый старый файл, если он существует
            oldest_log = f"{base_name}_{self.backup_count}{ext}"
            if os.path.exists(oldest_log):
                os.remove(oldest_log)

            # Перемещаем файлы в порядке убывания
            for i in range(self.backup_count - 1, 0, -1):
                src = f"{base_name}_{i}{ext}"
                dst = f"{base_name}_{i + 1}{ext}"
                if os.path.exists(src):
                    shutil.move(src, dst)

            # Переименовываем текущий файл
            new_filename = f"{base_name}_1{ext}"
            shutil.move(self.filename, new_filename)

            # Создаем новый пустой файл для записи
            async with aiofiles.open(self.filename, "a") as log_file:
                pass  # Закрытие потока после открытия


def log_bytes_info(file: Union[UploadFile, bytes], additional_info: str = ""):
    """Логирует информацию о потоке байтов или файле."""
    if isinstance(file, UploadFile):
        content_type = file.content_type
        filename = file.filename
        file_size = len(file.file.read())
        file.file.seek(0)
        return f"{additional_info} File: {filename}, Content-Type: {content_type}, Size: {file_size} bytes"
    elif isinstance(file, bytes):
        file_size = len(file)
        return f"{additional_info} Bytes stream with size: {file_size} bytes"
    else:
        return f"{additional_info} Unknown file type"


def logger():
    """Декоратор для логирования вызовов функций."""

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            logger_log = await setup_logger()

            args_info = [
                (
                    log_bytes_info(arg, additional_info="Received argument")
                    if isinstance(arg, (UploadFile, bytes))
                    else str(arg)
                )
                for arg in args
            ]
            kwargs_info = {
                k: (
                    log_bytes_info(v, additional_info="Received keyword argument")
                    if isinstance(v, (UploadFile, bytes))
                    else v
                )
                for k, v in kwargs.items()
            }

            try:
                await logger_log.info(
                    f"Вызов функции {func.__name__} с аргументами: {args_info}, ключевыми аргументами: {kwargs_info}"
                )
                result = await func(*args, **kwargs)
                await logger_log.info(f"Функция {func.__name__} вернула: {result}")
                return result
            except Exception as e:
                error_trace = traceback.format_exc()
                await logger_log.error(
                    f"Ошибка в функции {func.__name__}: {str(e)}\nТрассировка: {error_trace}"
                )
                raise e

        return wrapper

    return decorator
