#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для перевода architecture.excalidraw на русский язык
и добавления BPMN процессов
"""

import json
import sys

# Словарь переводов
TRANSLATIONS = {
    # Заголовки
    "BETON CRM - System Architecture": "BETON CRM - Архитектура Системы",
    "Full-Stack TypeScript Application with Bitrix24 Integration": "Full-Stack TypeScript приложение с интеграцией Bitrix24",
    "Legend": "Легенда",

    # Цвета и стрелки
    "Colors:": "Цвета:",
    "Frontend (React)": "Фронтенд (React)",
    "Backend (Express)": "Бэкенд (Express)",
    "Database (PostgreSQL)": "База данных (PostgreSQL)",
    "External (Bitrix24)": "Внешние сервисы (Bitrix24)",
    "Cache (Memory)": "Кэш (в памяти)",
    "Arrows:": "Стрелки:",
    "Solid - Synchronous call": "Сплошная - Синхронный вызов",
    "Dashed - Asynchronous call": "Пунктирная - Асинхронный вызов",
    "Dotted - Error flow": "Точечная - Поток ошибок",

    # Frame names
    "FRONTEND (React + TypeScript)": "ФРОНТЕНД (React + TypeScript)",
    "BACKEND (Node.js/Express)": "БЭКЕНД (Node.js/Express)",
    "DATABASE (PostgreSQL)": "БАЗА ДАННЫХ (PostgreSQL)",
    "INTEGRATIONS (Bitrix24, ES, Cache)": "ИНТЕГРАЦИИ (Bitrix24, ES, Кэш)",
    "DOCKER INFRASTRUCTURE": "DOCKER ИНФРАСТРУКТУРА",

    # User Journey
    "User Journey": "Путь Пользователя",
    "Admin Journey": "Путь Администратора",
    "Login": "Авторизация",
    "HomePage": "Главная страница",
    "Fill BetoneForm": "Заполнить форму",
    "Submit": "Отправить",
    "Formik validation": "Валидация Formik",

    # Components
    "BetoneForm Component:": "Компонент BetoneForm:",
    "FormSection (collapsible)": "FormSection (сворачиваемый)",
    "FormField Types:": "Типы полей FormField:",
    "Linked fields": "Связанные поля",
    "MySubmissions Page:": "Страница МоиЗаявки:",
    "View submissions table": "Просмотр таблицы заявок",
    "Edit submission": "Редактировать заявку",
    "Copy submission": "Копировать заявку",
    "Cancel submission": "Отменить заявку",

    # Admin tabs
    "AdminPage (7 tabs):": "Страница Администратора (7 вкладок):",
    "Forms List - manage forms": "Список форм - управление формами",
    "Form Editor - drag-and-drop builder": "Редактор форм - конструктор drag-and-drop",
    "Database - view all submissions": "База данных - просмотр всех заявок",
    "Nomenclature - products management": "Номенклатура - управление товарами",
    "Counterparties - companies/contacts": "Контрагенты - компании/контакты",
    "Bitrix24 - integration settings": "Bitrix24 - настройки интеграции",
    "Settings - system configuration": "Настройки - конфигурация системы",

    # State Management
    "State Management:": "Управление состоянием:",
    "Auth Context (user, role, JWT)": "Auth Context (пользователь, роль, JWT)",
    "Notification Context (toast)": "Notification Context (уведомления)",
    "React Query (server state)": "React Query (серверное состояние)",
    "Formik (form state)": "Formik (состояние формы)",

    # API
    "API Routes Tree": "Дерево API маршрутов",
    "endpoints": "эндпоинтов",

    # Services
    "Services Layer:": "Слой сервисов:",
    "Middleware Stack:": "Стек Middleware:",

    # Database
    "ER Diagram": "ER Диаграмма",
    "Relations:": "Связи:",
    "Indices:": "Индексы:",
    "Performance Features": "Оптимизации производительности",

    # Workflows
    "Data Flow Workflows": "Потоки данных",
    "Workflow": "Процесс",
    "Submission Lifecycle": "Жизненный цикл заявки",
    "Dynamic Options Loading": "Загрузка динамических опций",
    "Linked Fields Auto-Population": "Авто-заполнение связанных полей",
    "Period Submissions": "Периодические заявки",

    # Features
    "All Features": "Все возможности",
    "User Roles": "Роли пользователей",

    # Docker
    "Image:": "Образ:",
    "Port:": "Порт:",
    "Volume:": "Том:",
    "Command:": "Команда:",
    "Health:": "Проверка здоровья:",
    "Network:": "Сеть:",
}

def translate_text(text):
    """Переводит текст используя словарь переводов"""
    if not text or not isinstance(text, str):
        return text

    # Прямой перевод
    if text in TRANSLATIONS:
        return TRANSLATIONS[text]

    # Частичный перевод по ключевым словам
    result = text
    for en, ru in TRANSLATIONS.items():
        if en in result:
            result = result.replace(en, ru)

    return result

def create_bpmn_process_1(start_x, start_y):
    """
    BPMN Процесс 1: Создание заявки пользователем
    """
    elements = []
    y_offset = 0
    x_step = 180

    # Заголовок
    elements.append({
        "id": f"bpmn1-title",
        "type": "text",
        "x": start_x,
        "y": start_y - 40,
        "width": 800,
        "height": 35,
        "fontSize": 28,
        "fontFamily": 1,
        "text": "🔄 BPMN: Создание заявки пользователем",
        "textAlign": "left",
        "verticalAlign": "top",
        "baseline": 28,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "locked": False
    })

    # Start Event
    elements.append({
        "id": "bpmn1-start",
        "type": "ellipse",
        "x": start_x,
        "y": start_y + y_offset,
        "width": 60,
        "height": 60,
        "strokeColor": "#2b8a3e",
        "backgroundColor": "#c3fae8",
        "fillStyle": "solid",
        "strokeWidth": 3,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "roundness": None,
        "locked": False
    })

    elements.append({
        "id": "bpmn1-start-text",
        "type": "text",
        "x": start_x + 5,
        "y": start_y + y_offset + 70,
        "width": 50,
        "height": 20,
        "fontSize": 14,
        "fontFamily": 1,
        "text": "Старт",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "locked": False
    })

    # Task 1: Открыть форму
    x_pos = start_x + x_step
    elements.append({
        "id": "bpmn1-task1",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y + y_offset,
        "width": 140,
        "height": 80,
        "strokeColor": "#1971c2",
        "backgroundColor": "#e7f5ff",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn1-task1-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + y_offset + 25,
        "width": 120,
        "height": 30,
        "fontSize": 14,
        "fontFamily": 1,
        "text": "Открыть\nформу заявки",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 24,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "containerId": "bpmn1-task1",
        "locked": False
    })

    # Arrow start -> task1
    elements.append({
        "id": "bpmn1-arrow1",
        "type": "arrow",
        "x": start_x + 60,
        "y": start_y + y_offset + 30,
        "width": x_step - 60,
        "height": 0,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn1"],
        "frameId": None,
        "points": [[0, 0], [x_step - 60, 0]],
        "locked": False
    })

    # Task 2: Заполнить поля
    x_pos += x_step
    elements.append({
        "id": "bpmn1-task2",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y + y_offset,
        "width": 140,
        "height": 80,
        "strokeColor": "#1971c2",
        "backgroundColor": "#e7f5ff",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn1-task2-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + y_offset + 25,
        "width": 120,
        "height": 30,
        "fontSize": 14,
        "fontFamily": 1,
        "text": "Заполнить\nполя формы",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 24,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "containerId": "bpmn1-task2",
        "locked": False
    })

    # Arrow task1 -> task2
    elements.append({
        "id": "bpmn1-arrow2",
        "type": "arrow",
        "x": x_pos - x_step + 140,
        "y": start_y + y_offset + 40,
        "width": x_step - 140,
        "height": 0,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn1"],
        "frameId": None,
        "points": [[0, 0], [x_step - 140, 0]],
        "locked": False
    })

    # Gateway: Валидация
    x_pos += x_step
    elements.append({
        "id": "bpmn1-gateway1",
        "type": "diamond",
        "x": x_pos,
        "y": start_y + y_offset - 10,
        "width": 100,
        "height": 100,
        "strokeColor": "#f59f00",
        "backgroundColor": "#fff3bf",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "locked": False
    })

    elements.append({
        "id": "bpmn1-gateway1-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + y_offset + 25,
        "width": 80,
        "height": 30,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Данные\nвалидны?",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 24,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "locked": False
    })

    # Arrow task2 -> gateway
    elements.append({
        "id": "bpmn1-arrow3",
        "type": "arrow",
        "x": x_pos - x_step + 140,
        "y": start_y + y_offset + 40,
        "width": x_step - 140,
        "height": 0,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn1"],
        "frameId": None,
        "points": [[0, 0], [x_step - 140, 0]],
        "locked": False
    })

    # Task 3: Отправить заявку
    x_pos += x_step
    elements.append({
        "id": "bpmn1-task3",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y + y_offset,
        "width": 140,
        "height": 80,
        "strokeColor": "#1971c2",
        "backgroundColor": "#e7f5ff",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn1-task3-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + y_offset + 15,
        "width": 120,
        "height": 50,
        "fontSize": 14,
        "fontFamily": 1,
        "text": "Отправить\nзаявку\nPOST /api/\nforms/submit",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 44,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "containerId": "bpmn1-task3",
        "locked": False
    })

    # Arrow gateway -> task3 (Yes)
    elements.append({
        "id": "bpmn1-arrow4",
        "type": "arrow",
        "x": x_pos - x_step + 100,
        "y": start_y + y_offset + 40,
        "width": x_step - 100,
        "height": 0,
        "strokeColor": "#2b8a3e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn1"],
        "frameId": None,
        "points": [[0, 0], [x_step - 100, 0]],
        "locked": False
    })

    elements.append({
        "id": "bpmn1-arrow4-label",
        "type": "text",
        "x": x_pos - 90,
        "y": start_y + y_offset + 10,
        "width": 30,
        "height": 20,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Да",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#2b8a3e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "locked": False
    })

    # Arrow gateway -> task2 (No) - обратная связь
    elements.append({
        "id": "bpmn1-arrow5",
        "type": "arrow",
        "x": x_pos - x_step,
        "y": start_y + y_offset + 90,
        "width": -(x_step - 140),
        "height": 100,
        "strokeColor": "#e03131",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "dashed",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn1"],
        "frameId": None,
        "points": [[0, 0], [0, 50], [-(x_step - 140), 50], [-(x_step - 140), 100]],
        "locked": False
    })

    elements.append({
        "id": "bpmn1-arrow5-label",
        "type": "text",
        "x": x_pos - x_step + 10,
        "y": start_y + y_offset + 110,
        "width": 60,
        "height": 20,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Нет\nОшибки",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#e03131",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "locked": False
    })

    # Task 4: Сохранить в БД
    x_pos += x_step
    elements.append({
        "id": "bpmn1-task4",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y + y_offset,
        "width": 140,
        "height": 80,
        "strokeColor": "#9c36b5",
        "backgroundColor": "#f3e5f5",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn1-task4-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + y_offset + 15,
        "width": 120,
        "height": 50,
        "fontSize": 13,
        "fontFamily": 1,
        "text": "Сохранить\nв PostgreSQL\nstatus='NEW'",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 44,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "containerId": "bpmn1-task4",
        "locked": False
    })

    # Arrow task3 -> task4
    elements.append({
        "id": "bpmn1-arrow6",
        "type": "arrow",
        "x": x_pos - x_step + 140,
        "y": start_y + y_offset + 40,
        "width": x_step - 140,
        "height": 0,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn1"],
        "frameId": None,
        "points": [[0, 0], [x_step - 140, 0]],
        "locked": False
    })

    # Task 5: Async синхронизация
    x_pos += x_step
    elements.append({
        "id": "bpmn1-task5",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y + y_offset,
        "width": 140,
        "height": 80,
        "strokeColor": "#2f9e44",
        "backgroundColor": "#e8f5e9",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn1-task5-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + y_offset + 10,
        "width": 120,
        "height": 60,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "ASYNC:\nСинхронизация\nс Bitrix24\n& Elasticsearch",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 54,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "containerId": "bpmn1-task5",
        "locked": False
    })

    # Arrow task4 -> task5 (async)
    elements.append({
        "id": "bpmn1-arrow7",
        "type": "arrow",
        "x": x_pos - x_step + 140,
        "y": start_y + y_offset + 40,
        "width": x_step - 140,
        "height": 0,
        "strokeColor": "#f59f00",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "dashed",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn1"],
        "frameId": None,
        "points": [[0, 0], [x_step - 140, 0]],
        "locked": False
    })

    elements.append({
        "id": "bpmn1-arrow7-label",
        "type": "text",
        "x": x_pos - 100,
        "y": start_y + y_offset + 10,
        "width": 90,
        "height": 20,
        "fontSize": 11,
        "fontFamily": 1,
        "text": "setImmediate()",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#f59f00",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "locked": False
    })

    # End Event
    x_pos += x_step
    elements.append({
        "id": "bpmn1-end",
        "type": "ellipse",
        "x": x_pos,
        "y": start_y + y_offset,
        "width": 60,
        "height": 60,
        "strokeColor": "#c92a2a",
        "backgroundColor": "#ffe3e3",
        "fillStyle": "solid",
        "strokeWidth": 5,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "roundness": None,
        "locked": False
    })

    elements.append({
        "id": "bpmn1-end-text",
        "type": "text",
        "x": x_pos + 5,
        "y": start_y + y_offset + 70,
        "width": 50,
        "height": 20,
        "fontSize": 14,
        "fontFamily": 1,
        "text": "Конец",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn1"],
        "frameId": None,
        "locked": False
    })

    # Arrow task5 -> end
    elements.append({
        "id": "bpmn1-arrow8",
        "type": "arrow",
        "x": x_pos - x_step + 140,
        "y": start_y + y_offset + 40,
        "width": x_step - 140,
        "height": 0,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn1"],
        "frameId": None,
        "points": [[0, 0], [x_step - 140, 0]],
        "locked": False
    })

    return elements

def create_bpmn_process_2(start_x, start_y):
    """
    BPMN Процесс 2: Синхронизация с Bitrix24
    """
    elements = []

    # Заголовок
    elements.append({
        "id": "bpmn2-title",
        "type": "text",
        "x": start_x,
        "y": start_y - 40,
        "width": 800,
        "height": 35,
        "fontSize": 28,
        "fontFamily": 1,
        "text": "🔄 BPMN: Синхронизация заявки с Bitrix24",
        "textAlign": "left",
        "verticalAlign": "top",
        "baseline": 28,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Процесс будет более компактным
    x_step = 200

    # Start
    elements.append({
        "id": "bpmn2-start",
        "type": "ellipse",
        "x": start_x,
        "y": start_y,
        "width": 60,
        "height": 60,
        "strokeColor": "#2b8a3e",
        "backgroundColor": "#c3fae8",
        "fillStyle": "solid",
        "strokeWidth": 3,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Task 1: Получить submission
    x_pos = start_x + x_step
    elements.append({
        "id": "bpmn2-task1",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y,
        "width": 150,
        "height": 80,
        "strokeColor": "#9c36b5",
        "backgroundColor": "#f3e5f5",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn2-task1-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 15,
        "width": 130,
        "height": 50,
        "fontSize": 13,
        "fontFamily": 1,
        "text": "Получить\nsubmission\nиз PostgreSQL",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 44,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Task 2: Маппинг полей
    x_pos += x_step
    elements.append({
        "id": "bpmn2-task2",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y,
        "width": 150,
        "height": 80,
        "strokeColor": "#1971c2",
        "backgroundColor": "#e7f5ff",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn2-task2-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 10,
        "width": 130,
        "height": 60,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Маппинг полей\nformData →\ndealData\n(bitrixFieldId)",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 54,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Task 3: Отправить в Bitrix24
    x_pos += x_step
    elements.append({
        "id": "bpmn2-task3",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y,
        "width": 150,
        "height": 80,
        "strokeColor": "#2f9e44",
        "backgroundColor": "#e8f5e9",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn2-task3-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 5,
        "width": 130,
        "height": 70,
        "fontSize": 11,
        "fontFamily": 1,
        "text": "POST Bitrix24\ncrm.deal.add\nwebhook\n(retry: 3 раза)",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 64,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Gateway: Успешно?
    x_pos += x_step
    elements.append({
        "id": "bpmn2-gateway",
        "type": "diamond",
        "x": x_pos,
        "y": start_y - 10,
        "width": 100,
        "height": 100,
        "strokeColor": "#f59f00",
        "backgroundColor": "#fff3bf",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    elements.append({
        "id": "bpmn2-gateway-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 25,
        "width": 80,
        "height": 30,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Успешно?",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 24,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Task 4: Обновить статус (Success)
    x_pos += x_step
    elements.append({
        "id": "bpmn2-task4",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y,
        "width": 150,
        "height": 80,
        "strokeColor": "#9c36b5",
        "backgroundColor": "#f3e5f5",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn2-task4-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 5,
        "width": 130,
        "height": 70,
        "fontSize": 11,
        "fontFamily": 1,
        "text": "UPDATE\nbitrixDealId\nbitrixSyncStatus\n='SYNCED'",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 64,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Task 5: Записать ошибку (Error branch)
    elements.append({
        "id": "bpmn2-task5",
        "type": "rectangle",
        "x": x_pos - x_step,
        "y": start_y + 150,
        "width": 150,
        "height": 80,
        "strokeColor": "#c92a2a",
        "backgroundColor": "#ffe3e3",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn2-task5-text",
        "type": "text",
        "x": x_pos - x_step + 10,
        "y": start_y + 160,
        "width": 130,
        "height": 60,
        "fontSize": 11,
        "fontFamily": 1,
        "text": "UPDATE\nbitrixSyncStatus\n='FAILED'\nbitrixSyncError",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 54,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Arrow gateway -> task5 (No)
    elements.append({
        "id": "bpmn2-arrow-error",
        "type": "arrow",
        "x": x_pos - x_step + 50,
        "y": start_y + 90,
        "width": 0,
        "height": 60,
        "strokeColor": "#e03131",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn2"],
        "frameId": None,
        "points": [[0, 0], [0, 60]],
        "locked": False
    })

    elements.append({
        "id": "bpmn2-arrow-error-label",
        "type": "text",
        "x": x_pos - x_step + 60,
        "y": start_y + 110,
        "width": 40,
        "height": 20,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Нет",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#e03131",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # End Event
    x_pos += x_step
    elements.append({
        "id": "bpmn2-end",
        "type": "ellipse",
        "x": x_pos,
        "y": start_y,
        "width": 60,
        "height": 60,
        "strokeColor": "#c92a2a",
        "backgroundColor": "#ffe3e3",
        "fillStyle": "solid",
        "strokeWidth": 5,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    # Добавляем стрелки между элементами
    arrows = [
        {"from": start_x + 60, "to": start_x + x_step, "y": start_y + 30},
        {"from": start_x + x_step + 150, "to": start_x + x_step * 2, "y": start_y + 40},
        {"from": start_x + x_step * 2 + 150, "to": start_x + x_step * 3, "y": start_y + 40},
        {"from": start_x + x_step * 3 + 100, "to": start_x + x_step * 4, "y": start_y + 40},
        {"from": start_x + x_step * 4 + 150, "to": start_x + x_step * 5, "y": start_y + 40},
    ]

    for i, arrow in enumerate(arrows):
        elements.append({
            "id": f"bpmn2-arrow{i+1}",
            "type": "arrow",
            "x": arrow["from"],
            "y": arrow["y"],
            "width": arrow["to"] - arrow["from"],
            "height": 0,
            "strokeColor": "#1e1e1e" if i < 3 else "#2b8a3e",
            "backgroundColor": "transparent",
            "fillStyle": "solid",
            "strokeWidth": 2,
            "strokeStyle": "solid",
            "roughness": 0,
            "opacity": 100,
            "angle": 0,
            "startArrowhead": None,
            "endArrowhead": "arrow",
            "groupIds": ["bpmn2"],
            "frameId": None,
            "points": [[0, 0], [arrow["to"] - arrow["from"], 0]],
            "locked": False
        })

    # Label для успешного пути
    elements.append({
        "id": "bpmn2-success-label",
        "type": "text",
        "x": start_x + x_step * 4 - 30,
        "y": start_y + 10,
        "width": 30,
        "height": 20,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Да",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#2b8a3e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn2"],
        "frameId": None,
        "locked": False
    })

    return elements

def create_bpmn_process_3(start_x, start_y):
    """
    BPMN Процесс 3: Работа администратора
    """
    elements = []

    # Заголовок
    elements.append({
        "id": "bpmn3-title",
        "type": "text",
        "x": start_x,
        "y": start_y - 40,
        "width": 800,
        "height": 35,
        "fontSize": 28,
        "fontFamily": 1,
        "text": "🔄 BPMN: Управление системой администратором",
        "textAlign": "left",
        "verticalAlign": "top",
        "baseline": 28,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    x_step = 220

    # Start
    elements.append({
        "id": "bpmn3-start",
        "type": "ellipse",
        "x": start_x,
        "y": start_y,
        "width": 60,
        "height": 60,
        "strokeColor": "#2b8a3e",
        "backgroundColor": "#c3fae8",
        "fillStyle": "solid",
        "strokeWidth": 3,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Task 1: Авторизация
    x_pos = start_x + 150
    elements.append({
        "id": "bpmn3-task1",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y,
        "width": 140,
        "height": 70,
        "strokeColor": "#1971c2",
        "backgroundColor": "#e7f5ff",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn3-task1-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 15,
        "width": 120,
        "height": 40,
        "fontSize": 13,
        "fontFamily": 1,
        "text": "Авторизация\nадмина\n(admin-login)",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 34,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Gateway: Выбор действия
    x_pos += x_step
    elements.append({
        "id": "bpmn3-gateway",
        "type": "diamond",
        "x": x_pos,
        "y": start_y - 20,
        "width": 110,
        "height": 110,
        "strokeColor": "#f59f00",
        "backgroundColor": "#fff3bf",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    elements.append({
        "id": "bpmn3-gateway-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 15,
        "width": 90,
        "height": 40,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Выбор\nдействия",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 34,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Три пути: Формы, База данных, Настройки
    x_pos += x_step

    # Path 1: Управление формами (верхний путь)
    elements.append({
        "id": "bpmn3-task2a",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y - 150,
        "width": 160,
        "height": 70,
        "strokeColor": "#9c36b5",
        "backgroundColor": "#f3e5f5",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn3-task2a-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y - 140,
        "width": 140,
        "height": 50,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Управление\nформами\n(FormEditor)",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 44,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Arrow gateway -> task2a
    elements.append({
        "id": "bpmn3-arrow2a",
        "type": "arrow",
        "x": x_pos - x_step + 55,
        "y": start_y - 20,
        "width": x_step - 55,
        "height": -95,
        "strokeColor": "#9c36b5",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [100, -95], [x_step - 55, -95]],
        "locked": False
    })

    elements.append({
        "id": "bpmn3-label2a",
        "type": "text",
        "x": x_pos - 100,
        "y": start_y - 135,
        "width": 80,
        "height": 20,
        "fontSize": 11,
        "fontFamily": 1,
        "text": "Формы",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#9c36b5",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Path 2: Просмотр БД (средний путь)
    elements.append({
        "id": "bpmn3-task2b",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y,
        "width": 160,
        "height": 70,
        "strokeColor": "#1971c2",
        "backgroundColor": "#e7f5ff",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn3-task2b-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 10,
        "width": 140,
        "height": 50,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Просмотр БД\n(все заявки,\nфильтры)",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 44,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Arrow gateway -> task2b
    elements.append({
        "id": "bpmn3-arrow2b",
        "type": "arrow",
        "x": x_pos - x_step + 110,
        "y": start_y + 35,
        "width": x_step - 110,
        "height": 0,
        "strokeColor": "#1971c2",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [x_step - 110, 0]],
        "locked": False
    })

    elements.append({
        "id": "bpmn3-label2b",
        "type": "text",
        "x": x_pos - 80,
        "y": start_y + 10,
        "width": 60,
        "height": 20,
        "fontSize": 11,
        "fontFamily": 1,
        "text": "БД",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#1971c2",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Path 3: Настройки (нижний путь)
    elements.append({
        "id": "bpmn3-task2c",
        "type": "rectangle",
        "x": x_pos,
        "y": start_y + 150,
        "width": 160,
        "height": 70,
        "strokeColor": "#e67700",
        "backgroundColor": "#fff3e0",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "roundness": {"type": 3},
        "locked": False
    })

    elements.append({
        "id": "bpmn3-task2c-text",
        "type": "text",
        "x": x_pos + 10,
        "y": start_y + 160,
        "width": 140,
        "height": 50,
        "fontSize": 12,
        "fontFamily": 1,
        "text": "Настройки\nсистемы\n(Bitrix24, ES)",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 44,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Arrow gateway -> task2c
    elements.append({
        "id": "bpmn3-arrow2c",
        "type": "arrow",
        "x": x_pos - x_step + 55,
        "y": start_y + 90,
        "width": x_step - 55,
        "height": 95,
        "strokeColor": "#e67700",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [100, 95], [x_step - 55, 95]],
        "locked": False
    })

    elements.append({
        "id": "bpmn3-label2c",
        "type": "text",
        "x": x_pos - 100,
        "y": start_y + 165,
        "width": 80,
        "height": 20,
        "fontSize": 11,
        "fontFamily": 1,
        "text": "Настройки",
        "textAlign": "center",
        "verticalAlign": "top",
        "baseline": 14,
        "strokeColor": "#e67700",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Merge Gateway
    x_pos += x_step + 40
    elements.append({
        "id": "bpmn3-gateway2",
        "type": "diamond",
        "x": x_pos,
        "y": start_y - 20,
        "width": 110,
        "height": 110,
        "strokeColor": "#f59f00",
        "backgroundColor": "#fff3bf",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Arrows from tasks to merge gateway
    # From task2a
    elements.append({
        "id": "bpmn3-arrow3a",
        "type": "arrow",
        "x": x_pos - x_step - 40 + 160,
        "y": start_y - 115,
        "width": x_step + 40 - 160 + 55,
        "height": 150,
        "strokeColor": "#9c36b5",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [100, 0], [100, 150], [x_step + 40 - 160 + 55, 150]],
        "locked": False
    })

    # From task2b
    elements.append({
        "id": "bpmn3-arrow3b",
        "type": "arrow",
        "x": x_pos - x_step - 40 + 160,
        "y": start_y + 35,
        "width": x_step + 40 - 160,
        "height": 0,
        "strokeColor": "#1971c2",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [x_step + 40 - 160, 0]],
        "locked": False
    })

    # From task2c
    elements.append({
        "id": "bpmn3-arrow3c",
        "type": "arrow",
        "x": x_pos - x_step - 40 + 160,
        "y": start_y + 185,
        "width": x_step + 40 - 160 + 55,
        "height": -150,
        "strokeColor": "#e67700",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [100, 0], [100, -150], [x_step + 40 - 160 + 55, -150]],
        "locked": False
    })

    # End Event
    x_pos += 180
    elements.append({
        "id": "bpmn3-end",
        "type": "ellipse",
        "x": x_pos,
        "y": start_y,
        "width": 60,
        "height": 60,
        "strokeColor": "#c92a2a",
        "backgroundColor": "#ffe3e3",
        "fillStyle": "solid",
        "strokeWidth": 5,
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "groupIds": ["bpmn3"],
        "frameId": None,
        "locked": False
    })

    # Arrow merge gateway -> end
    elements.append({
        "id": "bpmn3-arrow4",
        "type": "arrow",
        "x": x_pos - 180 + 110,
        "y": start_y + 35,
        "width": 180 - 110,
        "height": 0,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [180 - 110, 0]],
        "locked": False
    })

    # Arrow start -> task1
    elements.append({
        "id": "bpmn3-arrow1",
        "type": "arrow",
        "x": start_x + 60,
        "y": start_y + 30,
        "width": 90,
        "height": 5,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [90, 5]],
        "locked": False
    })

    # Arrow task1 -> gateway
    elements.append({
        "id": "bpmn3-arrow1b",
        "type": "arrow",
        "x": start_x + 150 + 140,
        "y": start_y + 35,
        "width": 80,
        "height": 0,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "startArrowhead": None,
        "endArrowhead": "arrow",
        "groupIds": ["bpmn3"],
        "frameId": None,
        "points": [[0, 0], [80, 0]],
        "locked": False
    })

    return elements

def main():
    # Загрузить существующий файл
    input_file = "/Users/evgenijsikunov/projects/beton-crm/beton-crm/docs/architecture.excalidraw"

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Перевести текстовые элементы
    print("Переводим текстовые элементы...")
    for element in data['elements']:
        if element.get('type') == 'text' and 'text' in element:
            original = element['text']
            translated = translate_text(original)
            if translated != original:
                element['text'] = translated
                print(f"  Переведено: {original[:50]}... -> {translated[:50]}...")

        # Перевести имена фреймов
        if element.get('type') == 'frame' and 'name' in element:
            original = element['name']
            translated = translate_text(original)
            if translated != original:
                element['name'] = translated
                print(f"  Переведен фрейм: {original} -> {translated}")

    # Добавить BPMN процессы
    print("\nДобавляем BPMN процессы...")

    # BPMN процессы будут размещены ниже существующих workflow
    bpmn_start_y = 4300

    # Процесс 1: Создание заявки
    print("  Создаём BPMN процесс 1: Создание заявки...")
    bpmn1_elements = create_bpmn_process_1(100, bpmn_start_y)
    data['elements'].extend(bpmn1_elements)

    # Процесс 2: Синхронизация с Bitrix24
    print("  Создаём BPMN процесс 2: Синхронизация с Bitrix24...")
    bpmn2_elements = create_bpmn_process_2(100, bpmn_start_y + 400)
    data['elements'].extend(bpmn2_elements)

    # Процесс 3: Работа администратора
    print("  Создаём BPMN процесс 3: Работа администратора...")
    bpmn3_elements = create_bpmn_process_3(100, bpmn_start_y + 900)
    data['elements'].extend(bpmn3_elements)

    # Сохранить обновленный файл
    output_file = input_file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Файл успешно обновлен: {output_file}")
    print(f"   Добавлено элементов: {len(bpmn1_elements) + len(bpmn2_elements) + len(bpmn3_elements)}")
    print(f"   Всего элементов в схеме: {len(data['elements'])}")

if __name__ == "__main__":
    main()
