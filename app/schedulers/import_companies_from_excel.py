import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import (
    DATE_FORMATS,
    EXCEL_TO_DB_MAPPING,
    POSSIBLE_PATHS,
    PRIORITY_FIELDS,
    REQUIRED_COLUMNS,
    START_EXCEL_PARSING_TIME,
    TEST_DIRECTORIES,
    TEST_EXCEL_DATA,
)
from app.config import Settings as settings
from app.database_session import SessionLocal
from app.models import Company

scheduler = AsyncIOScheduler()


script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(script_dir, ".."))
sys.path.append(parent_dir)


async def find_excel_files_in_directory(directory: str) -> List[str]:
    """Находит все Excel-файлы в указанной директории."""
    if not os.path.exists(directory) or not os.path.isdir(directory):
        return []

    files = os.listdir(directory)
    excel_files = [
        os.path.join(directory, f)
        for f in files
        if f.endswith(".xlsx") or f.endswith(".xls")
    ]
    return excel_files


async def get_default_upload_directory() -> str:
    """Возвращает путь к директории загрузки Excel-файлов на основе окружения."""
    if settings.ENVIRONMENT == "production":
        for path in POSSIBLE_PATHS:
            if os.path.exists(path) and os.path.isdir(path):
                return path
    else:
        local_upload_dir = os.path.join(os.getcwd(), "upload")
        os.makedirs(local_upload_dir, exist_ok=True)
        return local_upload_dir


async def get_excel_files() -> List[str]:
    """Получает список Excel-файлов для обработки."""
    all_excel_files = []

    # Проверяем директорию из настроек
    upload_dir = settings.EXCEL_UPLOAD_PATH
    if upload_dir:
        excel_files = await find_excel_files_in_directory(upload_dir)
        all_excel_files.extend(excel_files)

    # Если файлы не найдены, проверяем другие возможные директории
    if not all_excel_files:
        default_upload_dir = await get_default_upload_directory()
        excel_files = await find_excel_files_in_directory(default_upload_dir)
        all_excel_files.extend(excel_files)

    # Если файлы всё ещё не найдены, создаём тестовый файл
    if not all_excel_files:
        if settings.ENVIRONMENT == "development":
            all_excel_files = await create_test_excel()

    return all_excel_files


async def create_test_excel() -> List[str]:
    """Создаёт тестовый Excel-файл для отладки."""
    for upload_dir in TEST_DIRECTORIES:
        if os.path.exists(upload_dir) and os.path.isdir(upload_dir):
            test_file_path = os.path.join(upload_dir, "test_companies.xlsx")
            df = pd.DataFrame(TEST_EXCEL_DATA)
            df.to_excel(test_file_path, index=False)
            return [test_file_path]
    return []


async def parse_date(date_str: str) -> Optional[datetime]:
    """Парсинг даты из строки."""
    if pd.isna(date_str):
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(str(date_str).strip(), fmt)
        except ValueError:
            continue
    return None


async def extract_company_data(row: pd.Series, df_columns: set) -> Dict[str, str]:
    """Извлечение данных компании из строки Excel."""
    company_data = {}
    for excel_col, db_col in EXCEL_TO_DB_MAPPING.items():
        if excel_col in df_columns and not pd.isna(row[excel_col]):
            if db_col == "last_sale_date":
                parsed_date = await parse_date(row[excel_col])
                if parsed_date:
                    company_data[db_col] = parsed_date
            else:
                company_data[db_col] = str(row[excel_col])
    return company_data


async def find_company_by_uid(db: AsyncSession, uid_1c: str) -> Optional[Company]:
    """Поиск компании по uid_1c."""
    result = await db.execute(select(Company).where(Company.uid_1c == uid_1c))
    return result.scalars().first()


async def find_company_by_inn(db: AsyncSession, inn: str) -> Optional[Company]:
    """Поиск компании по ИНН."""
    result = await db.execute(select(Company).where(Company.inn == inn))
    return result.scalars().first()


async def process_row(
    row: pd.Series, df_columns: set, db: AsyncSession
) -> (int, int, int, int):
    """Обработка одной строки Excel."""
    processed_count = 0
    updated_count = 0
    priority_updates_count = 0
    errors_count = 0

    try:
        company_data = await extract_company_data(row, df_columns)

        if "uid_1c" not in company_data or "name" not in company_data:
            errors_count += 1
            return processed_count, updated_count, priority_updates_count, errors_count

        dynamic_fields = {
            col.lower().replace(" ", "_"): str(row[col])
            for col in df_columns
            if col not in EXCEL_TO_DB_MAPPING and not pd.isna(row[col])
        }

        company = await find_company_by_uid(db, company_data["uid_1c"])
        if not company:
            inn = company_data.get("inn")
            if inn:
                company = await find_company_by_inn(db, inn)
                if company and not company.uid_1c:
                    company.uid_1c = company_data["uid_1c"]
        if company:
            priority_updates = []
            for field, value in company_data.items():
                if field in PRIORITY_FIELDS:
                    old_value = getattr(company, field)
                    if old_value != value:
                        priority_updates.append(f"{field}: {old_value} -> {value}")
                setattr(company, field, value)

            if company.dynamic_fields:
                company.dynamic_fields.update(dynamic_fields)
            else:
                company.dynamic_fields = dynamic_fields

            if priority_updates:
                priority_updates_count += 1
            updated_count += 1
        else:
            company = Company(
                **company_data,
                company_type="CUSTOMER",
                dynamic_fields=dynamic_fields,
                sync_status="pending",
            )
            db.add(company)
            processed_count += 1

        await db.commit()
        await db.refresh(company)
    except Exception:
        errors_count += 1
    return processed_count, updated_count, priority_updates_count, errors_count


async def process_excel_file(file_path: str):
    """Обработка Excel-файла и обновление таблицы компаний."""
    try:
        df = pd.read_excel(file_path, engine="openpyxl")
    except:
        df = pd.read_csv(file_path)

    missing_columns = REQUIRED_COLUMNS - set(df.columns)
    if missing_columns:
        return

    async with SessionLocal() as db:
        processed_count = 0
        updated_count = 0
        priority_updates_count = 0
        errors_count = 0

        for _, row in df.iterrows():
            (
                proc,
                upd,
                prio,
                errs,
            ) = await process_row(row, set(df.columns), db)
            processed_count += proc
            updated_count += upd
            priority_updates_count += prio
            errors_count += errs

        return (
            f"Excel file processed. Added: {processed_count}, "
            f"Updated: {updated_count}, Priority Updates: {priority_updates_count}, Errors: {errors_count}"
        )


@scheduler.scheduled_job(IntervalTrigger(minutes=START_EXCEL_PARSING_TIME))
async def start_excel_parsing():
    """Main function to run the import process."""
    excel_files = await get_excel_files()
    if not excel_files:
        return
    for file_path in excel_files:
        await process_excel_file(file_path)
