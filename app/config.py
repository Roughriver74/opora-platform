import os
from typing import List
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()


class Settings:
    DEV_MODE: bool = os.getenv("DEV_MODE", "True").lower() in ["true", "1", "yes"]
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DOCKER_ENV: str = os.getenv("DOCKER_ENV", "false").lower() in ["true", "1", "yes"]

    # Настройки базы данных
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://opora_user:opora_dev_pass@localhost:4202/opora_dev",
    )
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "opora_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "opora_dev_pass")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "opora_dev")
    POSTGRES_PORT: int = os.getenv("POSTGRES_PORT", 4202)

    # Настройки Bitrix24
    BITRIX24_WEBHOOK_URL: str = os.getenv(
        "BITRIX_API_ENDPOINT", ""
    )
    BITRIX24_SMART_PROCESS_VISIT_ID: int = int(
        os.getenv("BITRIX24_SMART_PROCESS_VISIT_ID", "1054")
    )

    # Настройки безопасности
    SECRET_KEY: str = os.getenv(
        "JWT_SECRET", os.getenv("SECRET_KEY", "your-secret-key-here")
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )

    # Настройки CORS
    cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:4200")
    CORS_ORIGINS: List[str] = ["*"] if DEV_MODE else cors_origins_str.split(",")

    # Настройки ЮКасса
    YUKASSA_SHOP_ID: str = os.getenv("YUKASSA_SHOP_ID", "")
    YUKASSA_SECRET_KEY: str = os.getenv("YUKASSA_SECRET_KEY", "")
    YUKASSA_RETURN_URL: str = os.getenv(
        "YUKASSA_RETURN_URL", "http://localhost:4200/admin/billing"
    )

    # Настройки SMTP (email)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@myopora.ru")
    APP_URL: str = os.getenv("APP_URL", "http://localhost:4200")

    # Настройки для файлов
    EXCEL_UPLOAD_PATH: str = os.getenv("EXCEL_UPLOAD_PATH", "./upload")
    TOKEN_DADATA = os.getenv("TOKEN_DADATA", "")
    SECRET_DADATA = os.getenv("SECRET_DADATA", "")


MOSCOW_TZ = ZoneInfo("Europe/Moscow")

EXCEL_TO_DB_MAPPING: dict = {
    "Код": "uid_1c",
    "Партнер": "name",
    "КПП": "kpp",
    "ИНН": "inn",
    "Бизнес регион": "region",
    "Основной менеджер": "main_manager",
    "Дата последней реализации": "last_sale_date",
    "Сумма документа": "document_amount",
}

PRIORITY_FIELDS: list = ["main_manager", "last_sale_date", "document_amount", "region"]
START_EXCEL_PARSING_TIME: int = 30

TEST_EXCEL_DATA: dict = {
    "Код": ["TEST001", "TEST002"],
    "Партнер": ["Тест Компания 1", "Тест Компания 2"],
    "ИНН": ["1234567890", "0987654321"],
    "КПП": ["123456789", "987654321"],
    "Бизнес регион": ["Москва", "Санкт-Петербург"],
    "Основной менеджер": ["Иванов И.И.", "Петров П.П."],
    "Дата последней реализации": ["01.01.2025", "02.02.2025"],
    "Сумма документа": [10000, 20000],
}

TEST_DIRECTORIES: list = [
    "/app/upload",
    "./upload",
]

DATE_FORMATS: list = [
    "%d.%m.%Y",  # 31.12.2024
    "%Y-%m-%d",  # 2024-12-31
    "%d/%m/%Y",  # 31/12/2024
    "%m/%d/%Y",  # 12/31/2024
]

DATE_FORMATS_UPDATE_VISIT: list = [
    "%Y-%m-%dT%H:%M:%S",  # ISO без временной зоны
    "%Y-%m-%dT%H:%M:%S%z",  # ISO с временной зоной
    "%Y-%m-%d %H:%M:%S",  # Дата с пробелом вместо T
    "%Y-%m-%d",  # Только дата
]

POSSIBLE_PATHS: list = [
    "/app/upload",
    "./upload",
    "/var/www/opora/prod/upload",
]

REQUIRED_COLUMNS: set = {"Код", "Партнер", "ИНН"}

CLINIC_SCHEMA_EXTRA: dict = {
    "example": {
        "name": "Test Company",
        "company_type": "CUSTOMER",
        "address": "Тестовый адрес",
        "city": "Москва",
        "country": "Россия",
        "inn": "1234567890",
        "dynamic_fields": {
            "UF_CRM_1741267701427": "1234567890",
            "UF_CRM_6679726eb1750": "Тестовый адрес",
        },
    }
}

DYNAMIC_FIELDS_TO_ADD: dict = {
    "company_type": str,
    "address": str,
    "city": str,
    "country": str,
    "inn": str,
    "working_mode": str,
    "uses_tokuama": str,
    "visits_spring": int,
    "visits_summer": int,
    "visits_autumn": int,
    "visits_winter": int,
}

EXTRACT_DYNAMIC_FIELDS_MAPPING: dict = {
    "company_type": "COMPANY_TYPE",
    "address": "ADDRESS",
    "city": "ADDRESS_CITY",
    "country": "ADDRESS_COUNTRY",
    "inn": "UF_CRM_1741267701427",
}

CREATE_CLINIC_MODEL_FIELDS: set = {
    "name",
    "company_type",
    "uid_1c",
    "inn",
    "kpp",
    "region",
    "main_manager",
    "last_sale_date",
    "document_amount",
    "bitrix_id",
    "sync_status",
    "is_network",
}

EXCLUDED_CLINIC_CREATE_SCHEMA_FIELDS: set = {
    "dynamic_fields",
    "last_visit_date",
    "visits_count",
    "last_synced",
}


UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/app/upload")

DATE_FIELDS_KEY: list = ["1732026275473", "1732026990932"]

BITRIX_FIELDS_MAP: dict = {
    "NAME": "name",
    "LAST_NAME": "last_name",
    "TYPE_ID": "contact_type",
    "EMAIL": "email",
    "PHONE": "phone",
}

GET_COMPANIES_PAYLOAD: dict = {
    "select": [
        "ID",
        "TITLE",
        "COMPANY_TYPE",
        "ADDRESS",
        "ADDRESS_CITY",
        "ADDRESS_COUNTRY",
        "UF_CRM_1741267701427",
    ]
}

BITRIX24_SELECT_PAYLOAD_FIELDS: list = [
    "ID",
    "TITLE",
    "UF_CRM_1741267701427",
    "ADDRESS",
    "CITY",
]

CRM_COMPANY_UPDATE: str = "crm.company.update"
CRM_CONTACT_UPDATE: str = "crm.contact.update"
CRM_CONTACT_LIST: str = "crm.contact.list"

NETWORK_CLINIC_PROCESS_ID: int = 1110
VISIT_ENTITY_TYPE_ID: int = 1054
DADATA_NAME: str = "address"

DADATA_MAPPING: dict = {
    0: "Адрес распознан",
    1: "В адресе есть не распознанные части",
    2: "Адрес не корректный",
    3: "Есть альтернативные варианты адреса",
}

TASK_BITRIX_ADD = "tasks.task.add"
DEAL_BITRIX_ADD = "crm.deal.add"
USER_BITRIX_GET = "user.get"

TEMP_FOLDER_ID: int = 241373
