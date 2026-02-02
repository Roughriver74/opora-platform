#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Полный перевод architecture.excalidraw на русский язык
"""

import json
import re

def translate_text(text):
    """Полный перевод всех текстов"""
    if not text or not isinstance(text, str):
        return text

    # Словарь для точных замен
    translations = {
        # Headers
        "BETON CRM - System Architecture": "BETON CRM - Архитектура Системы",
        "Full-Stack TypeScript Application with Bitrix24 Integration": "Full-Stack TypeScript приложение с интеграцией Bitrix24",

        # Legend
        "Legend": "Легенда",
        "Colors:": "Цвета:",
        "Frontend (React)": "Фронтенд (React)",
        "Backend (Express)": "Бэкенд (Express)",
        "Database (PostgreSQL)": "База данных (PostgreSQL)",
        "External (Bitrix24)": "Внешние (Bitrix24)",
        "Cache (Memory)": "Кэш (Память)",
        "Docker": "Docker",

        "Arrows:": "Стрелки:",
        "Solid - Synchronous call": "Сплошная - Синхронный вызов",
        "Dashed - Asynchronous call": "Пунктирная - Асинхронный вызов",
        "Dotted - Error flow": "Точечная - Поток ошибок",

        # Journey
        "User Journey": "Путь Пользователя",
        "Admin Journey": "Путь Администратора",

        # Actions
        "Login": "Авторизация",
        "user-login": "user-login",
        "admin-login": "admin-login",

        # Pages
        "HomePage": "Главная Страница",
        "AdminPage": "Страница Администратора",
        "MySubmissions Page:": "Страница МоиЗаявки:",

        # Form
        "Fill BetoneForm": "Заполнить BetoneForm",
        "Formik validation": "Валидация Formik",
        "BetoneForm Component:": "Компонент BetoneForm:",
        "FormSection (collapsible)": "FormSection (сворачиваемая)",
        "FormField Types:": "Типы полей FormField:",
        "Linked fields": "Связанные поля",
        "Submit Button": "Кнопка Отправить",

        # Types
        "text, email, phone, date": "text, email, phone, date",
        "dropdown, autocomplete": "dropdown, autocomplete",
        "radio, checkbox, textarea": "radio, checkbox, textarea",

        # Submissions
        "View submissions table": "Просмотр таблицы заявок",
        "Edit submission": "Редактировать заявку",
        "Copy submission": "Копировать заявку",
        "Cancel submission": "Отменить заявку",

        # Admin tabs
        "7 tabs": "7 вкладок",
        "Tab 1: Forms List": "Вкладка 1: Список Форм",
        "Tab 2: Form Editor": "Вкладка 2: Редактор Форм",
        "Tab 3: Database": "Вкладка 3: База Данных",
        "Tab 4: Nomenclature": "Вкладка 4: Номенклатура",
        "Tab 5: Counterparties": "Вкладка 5: Контрагенты",
        "Tab 6: Bitrix24": "Вкладка 6: Bitrix24",
        "Tab 7: Settings": "Вкладка 7: Настройки",

        # Admin actions
        "CRUD операции с формами": "CRUD операции с формами",
        "Управление активностью": "Управление активностью",
        "Drag-and-drop builder": "Конструктор Drag-and-drop",
        "Sections management": "Управление секциями",
        "Field types (10+)": "Типы полей (10+)",
        "Bitrix24 field mapping": "Маппинг полей Bitrix24",
        "Preview mode": "Режим предпросмотра",
        "Все submissions": "Все заявки",
        "Фильтры по статусу": "Фильтры по статусу",
        "Export/Import": "Экспорт/Импорт",

        # State Management
        "State Management:": "Управление Состоянием:",
        "Auth Context (user, role, JWT)": "Auth Context (пользователь, роль, JWT)",
        "Notification Context (toast)": "Notification Context (уведомления)",
        "React Query (server state)": "React Query (серверное состояние)",
        "Formik (form state)": "Formik (состояние форм)",

        # API Client
        "API Client:": "API Клиент:",
        "axios interceptors": "axios перехватчики",
        "JWT auth": "JWT авторизация",
        "retry on 401": "повтор при 401",
        "timeout": "таймаут",

        # Backend
        "API Routes Tree": "Дерево API Маршрутов",
        "endpoints": "эндпоинтов",
        "Services Layer:": "Слой Сервисов:",
        "Middleware Stack:": "Стек Middleware:",

        # Database
        "ER Diagram": "ER Диаграмма",
        "Core Entities:": "Основные Сущности:",
        "Relations:": "Связи:",
        "Indices:": "Индексы:",
        "Performance Features": "Оптимизации Производительности",

        # Entities
        "User:": "Пользователь:",
        "Form:": "Форма:",
        "FormField:": "Поле Формы:",
        "Submission": "Заявка",
        "Company:": "Компания:",
        "Contact:": "Контакт:",
        "Nomenclature:": "Номенклатура:",
        "Settings:": "Настройки:",

        # Fields
        "PK: id": "PK: id",
        "FK:": "FK:",
        "unique": "уникальный",
        "required": "обязательное",

        # Integration
        "API Methods:": "API Методы:",
        "createDeal": "createDeal",
        "updateDeal": "updateDeal",
        "getProducts": "getProducts",
        "getCompanies": "getCompanies",
        "getContacts": "getContacts",
        "getDealCategories": "getDealCategories",
        "getDealStages": "getDealStages",

        "5-Level Search Strategy": "5-уровневая Стратегия Поиска",
        "Search by ID": "Поиск по ID",
        "Exact name match": "Точное совпадение имени",
        "Partial name": "Частичное совпадение имени",
        "Description search": "Поиск в описании",
        "Fuzzy word match": "Нечёткое совпадение слов",

        "Cache:": "Кэш:",
        "TTL": "TTL",
        "Retry Mechanism:": "Механизм Повтора:",
        "attempts": "попыток",
        "exponential backoff": "экспоненциальная задержка",
        "Timeout:": "Таймаут:",
        "seconds per request": "секунд на запрос",

        # Field Mapping
        "Field Mapping:": "Маппинг Полей:",
        "Special fields:": "Специальные поля:",

        # Webhook
        "Webhook Handler:": "Обработчик Webhook:",
        "Input:": "Вход:",
        "Bitrix24 webhook payload": "Bitrix24 webhook данные",
        "Processing:": "Обработка:",
        "validate": "валидация",
        "find submission": "поиск заявки",
        "update status": "обновление статуса",
        "create history": "создание истории",

        # Cache
        "Memory Cache": "Кэш в Памяти",
        "NOT Redis": "НЕ Redis",
        "Key pattern:": "Паттерн ключа:",
        "Invalidation:": "Инвалидация:",
        "manual clear": "ручная очистка",
        "TTL expiration": "истечение TTL",

        # Elasticsearch
        "Index:": "Индекс:",
        "submissions": "заявки",
        "Indexed Fields:": "Индексированные Поля:",
        "Search Features:": "Функции Поиска:",
        "Full-text search": "Полнотекстовый поиск",
        "Multi-field search": "Многополевой поиск",
        "Fuzzy matching": "Нечёткое совпадение",
        "Aggregations": "Агрегации",
        "Fallback:": "Резервный вариант:",
        "If ES unavailable": "Если ES недоступен",
        "PostgreSQL ILIKE search": "PostgreSQL ILIKE поиск",

        # Docker
        "Image:": "Образ:",
        "Port:": "Порт:",
        "Volume:": "Том:",
        "Command:": "Команда:",
        "Health:": "Проверка:",
        "Network:": "Сеть:",
        "Internal only": "Только внутренний",
        "Currently using in-memory cache": "Сейчас используется кэш в памяти",

        # Workflows
        "Data Flow Workflows": "Потоки Данных",
        "Workflow": "Процесс",
        "Submission Lifecycle": "Жизненный Цикл Заявки",
        "Dynamic Options Loading": "Загрузка Динамических Опций",
        "Linked Fields Auto-Population": "Авто-Заполнение Связанных Полей",
        "Period Submissions": "Периодические Заявки",

        # Workflow details
        "User fills form": "Пользователь заполняет форму",
        "Backend validates": "Бэкенд валидирует",
        "INSERT INTO": "INSERT INTO",
        "SOURCE OF TRUTH": "ИСТОЧНИК ИСТИНЫ",
        "Return": "Возврат",
        "ASYNC Operations": "ASYNC Операции",
        "setImmediate": "setImmediate",
        "doesn't block response": "не блокирует ответ",
        "Elasticsearch indexing": "Индексация Elasticsearch",
        "Bitrix24 sync": "Синхронизация Bitrix24",
        "if enabled": "если включено",
        "Map formData": "Маппинг formData",
        "using bitrixFieldId": "используя bitrixFieldId",
        "POST to Bitrix24 webhook": "POST на Bitrix24 webhook",
        "Receive dealId": "Получение dealId",
        "UPDATE submission SET": "UPDATE submission SET",
        "INSERT submission_history": "INSERT submission_history",
        "Webhook from Bitrix24": "Webhook от Bitrix24",
        "when deal changes": "при изменении сделки",
        "Find submission by bitrixDealId": "Найти заявку по bitrixDealId",
        "UPDATE status from Bitrix24": "UPDATE статус из Bitrix24",
        "CREATE history entry": "CREATE запись истории",

        # Dynamic options
        "User opens form": "Пользователь открывает форму",
        "detects field.dynamicSource.enabled": "обнаруживает field.dynamicSource.enabled",
        "Check memory cache": "Проверка кэша в памяти",
        "If CACHED": "Если В КЭШЕ",
        "Return cached data": "Вернуть данные из кэша",
        "If MISS": "Если ПРОМАХ",
        "Transform to": "Преобразовать в",
        "Return to frontend": "Вернуть во фронтенд",
        "FormField updates options": "FormField обновляет опции",
        "Render dropdown with data": "Отрисовать dropdown с данными",

        # Linked fields
        "User selects option in Field A": "Пользователь выбирает опцию в Поле A",
        "Trigger onChange event": "Триггер onChange события",
        "Check field.linkedFields.enabled": "Проверка field.linkedFields.enabled",
        "For each mapping:": "Для каждого маппинга:",
        "Extract targetFieldName": "Извлечь targetFieldName",
        "Fetch related data": "Получить связанные данные",
        "e.g., company by ID": "например, компания по ID",
        "Apply transformFunction": "Применить transformFunction",
        "Set value in Field B": "Установить значение в Поле B",
        "Form re-renders with populated fields": "Форма перерисовывается с заполненными полями",

        # Period submissions
        "Admin creates period submission": "Админ создаёт периодическую заявку",
        "Input:": "Вход:",
        "formId, startDate, endDate, frequency": "formId, startDate, endDate, frequency",
        "daily/weekly/monthly": "ежедневно/еженедельно/ежемесячно",
        "Generate dates array based on frequency": "Генерация массива дат по частоте",
        "For each date:": "Для каждой даты:",
        "CREATE Submission with isPeriodSubmission=true": "CREATE Submission с isPeriodSubmission=true",
        "SET periodGroupId": "SET periodGroupId",
        "shared UUID": "общий UUID",
        "SET periodPosition, totalInPeriod": "SET periodPosition, totalInPeriod",
        "Result:": "Результат:",
        "Multiple submissions created": "Создано несколько заявок",
        "All linked by periodGroupId": "Все связаны periodGroupId",
        "Can be managed as group": "Можно управлять как группой",
        "cancel all, update all": "отменить все, обновить все",

        # Annotations
        "PostgreSQL = SOURCE OF TRUTH": "PostgreSQL = ИСТОЧНИК ИСТИНЫ",
        "ASYNC Operations (Bitrix24, ES) don't block client response": "ASYNC Операции (Bitrix24, ES) не блокируют ответ клиенту",
        "5-Level Product Search Strategy": "5-уровневая Стратегия Поиска Товаров",
        "Denormalized Fields for performance": "Денормализованные Поля для производительности",
        "JWT: access 4h, refresh 7d": "JWT: доступ 4ч, обновление 7д",

        # Features
        "All Features": "Все Возможности",
        "Form Builder:": "Конструктор Форм:",
        "field types": "типов полей",
        "sections": "секций",
        "validation": "валидация",
        "Linked Fields:": "Связанные Поля:",
        "Auto-population between fields": "Авто-заполнение между полями",
        "Transform functions": "Функции преобразования",
        "Dynamic Options:": "Динамические Опции:",
        "Load from Bitrix24": "Загрузка из Bitrix24",
        "Products, Companies, Contacts": "Товары, Компании, Контакты",
        "Copy/Edit:": "Копировать/Редактировать:",
        "Copy existing submission": "Копировать существующую заявку",
        "Edit own submissions": "Редактировать свои заявки",
        "Export/Import:": "Экспорт/Импорт:",
        "Excel export": "Экспорт в Excel",
        "Bulk import": "Массовый импорт",
        "Full-text Search:": "Полнотекстовый Поиск:",
        "Elasticsearch with PostgreSQL fallback": "Elasticsearch с резервным PostgreSQL",
        "Multi-field search": "Многополевой поиск",
        "Mobile Optimization:": "Мобильная Оптимизация:",
        "SimpleMobileBetoneForm": "SimpleMobileBetoneForm",
        "Responsive layout": "Адаптивная вёрстка",
        "Period Submissions:": "Периодические Заявки:",
        "Recurring submissions": "Повторяющиеся заявки",
        "Group management": "Групповое управление",
        "Dashboard:": "Панель:",
        "Analytics and charts": "Аналитика и графики",
        "Status tracking": "Отслеживание статусов",
        "Tagging:": "Теги:",
        "Custom tags for submissions": "Пользовательские теги для заявок",
        "Filter by tags": "Фильтр по тегам",
        "User Management:": "Управление Пользователями:",
        "Role-based access": "Доступ на основе ролей",
        "user/admin roles": "роли user/admin",
        "Settings:": "Настройки:",
        "System configuration": "Конфигурация системы",
        "Bitrix24 integration": "Интеграция Bitrix24",
        "Notifications:": "Уведомления:",
        "Toast messages": "Всплывающие сообщения",
        "Status updates": "Обновления статусов",
        "History Tracking:": "История:",
        "submission_history table": "таблица submission_history",
        "All changes logged": "Все изменения логируются",
        "Security:": "Безопасность:",
        "JWT authentication": "JWT авторизация",
        "Password hashing": "Хеширование паролей",
        "Protected routes": "Защищённые маршруты",
        "Caching:": "Кэширование:",
        "Memory cache for Bitrix24": "Кэш в памяти для Bitrix24",
        "min TTL": "мин TTL",
        "Performance:": "Производительность:",
        "strategic indices": "стратегические индексы",
        "Denormalized fields": "Денормализованные поля",
        "JSONB flexibility": "Гибкость JSONB",
        "Docker:": "Docker:",
        "containers": "контейнеров",
        "docker-compose": "docker-compose",
        "Health Checks:": "Проверки Здоровья:",
        "diagnostic endpoints": "диагностические эндпоинты",

        # Roles
        "User Roles": "Роли Пользователей",
        "USER Role:": "Роль USER:",
        "ADMIN Role:": "Роль ADMIN:",
        "Permissions:": "Разрешения:",
        "View HomePage (form)": "Просмотр Главной Страницы (форма)",
        "Submit forms": "Отправка форм",
        "View own submissions": "Просмотр своих заявок",
        "Edit own submissions": "Редактирование своих заявок",
        "Copy own submissions": "Копирование своих заявок",
        "Cancel own submissions": "Отмена своих заявок",
        "All USER permissions": "Все разрешения USER",
        "Access AdminPage": "Доступ к AdminPage",
        "Manage forms": "Управление формами",
        "View all submissions": "Просмотр всех заявок",
        "Manage users": "Управление пользователями",
        "Manage nomenclature": "Управление номенклатурой",
        "Manage companies/contacts": "Управление компаниями/контактами",
        "Configure Bitrix24": "Конфигурация Bitrix24",
        "System settings": "Системные настройки",
    }

    # Применяем переводы
    result = text
    for en, ru in translations.items():
        result = result.replace(en, ru)

    return result

def main():
    input_file = "/Users/evgenijsikunov/projects/beton-crm/beton-crm/docs/architecture.excalidraw"

    print("Загружаем файл...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    translated_count = 0
    print("\nПереводим все текстовые элементы...")

    for element in data['elements']:
        # Переводим текст
        if element.get('type') == 'text' and 'text' in element:
            original = element['text']
            translated = translate_text(original)
            if translated != original:
                element['text'] = translated
                translated_count += 1
                if len(original) < 100:
                    print(f"  ✓ {original[:80]}")

        # Переводим имена фреймов
        if element.get('type') == 'frame' and 'name' in element:
            original = element['name']
            translated = translate_text(original)
            if translated != original:
                element['name'] = translated
                translated_count += 1
                print(f"  ✓ Фрейм: {original}")

    # Сохраняем
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Готово!")
    print(f"   Переведено элементов: {translated_count}")
    print(f"   Всего элементов: {len(data['elements'])}")
    print(f"\n💡 Файл: {input_file}")

if __name__ == "__main__":
    main()
