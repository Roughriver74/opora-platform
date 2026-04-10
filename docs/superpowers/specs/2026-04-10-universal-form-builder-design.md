# Universal Form Builder — Design Spec

**Дата:** 2026-04-10
**Статус:** Draft

## Контекст

Текущий редактор форм визитов (`VisitFormEditorPage.tsx`, 670 строк) имеет ряд ограничений:
- Работает только для визитов, хотя dynamic_fields есть у всех сущностей (Company, Contact, Doctor, NetworkClinic)
- Нет встроенной связи с Bitrix24 — маппинг полей настраивается на отдельной странице (`FieldMapping`)
- Нет возможности редактировать существующие поля — только добавить новое или удалить
- Drag-and-drop иконка не функциональна — порядок меняется только кнопками
- Монолитный компонент сложно поддерживать

## Цель

Создать универсальный модульный Form Builder, который:
1. Работает для всех entity types (visit, clinic, doctor, contact, network_clinic)
2. Объединяет конфигурацию полей и маппинг Bitrix24 в одном UI
3. Поддерживает полноценное редактирование полей через боковую панель (Drawer)
4. Реализует настоящий drag-and-drop через @dnd-kit
5. Разбит на переиспользуемые компоненты

---

## 1. Архитектура компонентов (Frontend)

### Структура файлов

```
frontend/src/components/FormBuilder/
├── FormBuilderPage.tsx          # Страница с табами entity type + заголовок
├── FormBuilder.tsx              # Контейнер: FieldList + FieldSettingsDrawer
├── FieldList.tsx                # Список полей с dnd-kit сортировкой
├── FieldCard.tsx                # Карточка одного поля (compact view)
├── FieldSettingsDrawer.tsx      # Drawer справа: вкладки "Основные" и "Bitrix24"
├── FieldPreviewDialog.tsx       # Модальный предпросмотр формы
├── BitrixFieldSelector.tsx      # Autocomplete для выбора поля Bitrix24
├── FieldOptionsEditor.tsx       # Редактор опций select-полей + value mapping
└── types.ts                     # TypeScript типы
```

### Типы (types.ts)

```typescript
export type EntityType = 'visit' | 'clinic' | 'doctor' | 'contact' | 'network_clinic';

export interface BitrixValueMapping {
  app_value: string;
  bitrix_value: string;
}

export interface FieldDefinition {
  key: string;                                    // Уникальный идентификатор
  label: string;                                  // Отображаемое название
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'number';
  required: boolean;
  options?: string[];                             // Для select: список вариантов
  bitrix_field_id?: string | null;                // ID поля в Bitrix24
  bitrix_field_type?: string | null;              // Тип поля в Bitrix24 (readonly)
  bitrix_value_mapping?: BitrixValueMapping[];    // Маппинг значений для list-полей
}

export interface FormTemplate {
  id?: number;
  organization_id?: number;
  entity_type: EntityType;
  fields: FieldDefinition[];
}

export interface BitrixField {
  field_id: string;       // "UF_CRM_1732026990932"
  title: string;          // "Тип визита"
  type: string;           // "list", "string", "datetime", "double"
  is_required: boolean;
  items?: Array<{ id: string; value: string }>;  // Для list-полей
}
```

### FormBuilderPage.tsx

Страница-обёртка, доступная по маршруту `/admin/form-builder`.

**Элементы:**
- Заголовок "Редактор форм"
- Табы MUI (`<Tabs>`) для переключения entity type:
  - Визиты | Компании | Контакты | Врачи | Сетевые клиники
- Кнопки "Просмотр" и "Сохранить" в верхнем правом углу
- Индикатор несохранённых изменений (точка или badge на кнопке Сохранить)
- Компонент `<FormBuilder entityType={selectedEntityType} />`

### FormBuilder.tsx

Основной контейнер, управляет состоянием.

**Состояние:**
- `fields: FieldDefinition[]` — текущие поля формы
- `selectedFieldIndex: number | null` — индекс выбранного поля (для Drawer)
- `hasChanges: boolean` — флаг несохранённых изменений
- `bitrixFields: BitrixField[]` — доступные поля Bitrix24 (загружаются при открытии вкладки B24)

**API вызовы:**
- `useQuery(['formTemplate', entityType])` — загрузка шаблона формы
- `useMutation` — сохранение шаблона
- `useQuery(['bitrixFields', entityType], { enabled: false })` — lazy-загрузка полей Bitrix24

**Layout:**
- Основная зона: `<FieldList>` с drag-and-drop
- Боковая панель: `<FieldSettingsDrawer>` (Drawer, ширина 420px, anchor="right")

### FieldList.tsx

Список полей с drag-and-drop через `@dnd-kit/core` + `@dnd-kit/sortable`.

**Элементы:**
- `<DndContext>` с `closestCenter` collision detection
- `<SortableContext>` с `verticalListSortingStrategy`
- Для каждого поля: `<SortableFieldCard>` (обёртка над FieldCard с useSortable)
- Внизу списка: кнопка "+ Добавить поле" (добавляет пустое поле и открывает Drawer)

**При drag-end:** обновляется порядок массива `fields` через `arrayMove` из `@dnd-kit/sortable`.

### FieldCard.tsx

Карточка одного поля в списке (compact view).

**Элементы:**
- Drag handle иконка (≡) слева — связана с `useSortable`
- Название поля (Typography, bold)
- Бейджи (Chip):
  - Тип поля (например "Выпадающий список") — цвет: primary
  - "Обязательное" — цвет: error (красный), показывается если `required === true`
  - "B24" — цвет: success (зелёный) если `bitrix_field_id` задан, grey если нет
- Кнопка удаления (IconButton с Delete icon) справа
- **onClick** на всю карточку → `onSelect(index)` → открывает Drawer

**Стилизация:**
- `Paper` с elevation, cursor: pointer
- Выделение при selected (border или background)
- Hover-эффект

### FieldSettingsDrawer.tsx

Боковая панель настроек выбранного поля.

**Tabs:**

**Вкладка "Основные":**
- Название поля (`TextField`, обязательное)
- Ключ (`TextField`, автогенерируется из названия через транслитерацию, редактируемый)
- Тип поля (`Select` из FIELD_TYPES)
- Обязательное (`Switch`)
- Если тип === 'select': `<FieldOptionsEditor>`
  - Список опций (Chip с кнопкой удаления)
  - TextField + кнопка "+" для добавления новой опции

**Вкладка "Bitrix24"** (скрывается если интеграция не подключена):
- `<BitrixFieldSelector>` — Autocomplete для поиска и выбора поля Bitrix24
  - Группировка по типу поля
  - Поиск по названию
  - При выборе: автоматически заполняет `bitrix_field_id` и `bitrix_field_type`
- Если `bitrix_field_type === 'list'` и `type === 'select'`:
  - Таблица маппинга значений: две колонки — "Значение в приложении" (из options) и "Значение в Bitrix24" (Select из items Bitrix24 поля)
  - Кнопка "Автоматически сопоставить" — сопоставляет по совпадению текста

### BitrixFieldSelector.tsx

Автокомплит для выбора поля Bitrix24.

**Props:**
- `entityType: EntityType`
- `value: string | null` (текущий bitrix_field_id)
- `onChange: (field: BitrixField | null) => void`

**Поведение:**
- При первом фокусе загружает список полей через `GET /admin/bitrix/fields/{entity_type}`
- Группирует по типу: "Текстовые", "Списки", "Даты", "Числа", "Чекбоксы"
- Отображает для каждого: `title (field_id)` — например "Тип визита (UF_CRM_123)"
- При выборе вызывает `onChange` с полным объектом BitrixField

### FieldOptionsEditor.tsx

Редактор опций для select-полей.

**Элементы:**
- Список текущих опций (Chip с onDelete)
- TextField + кнопка "+" для добавления
- Если включён маппинг Bitrix24 (bitrix_field_type === 'list'):
  - Каждая опция показывается как строка с двумя полями:
    - "Значение в приложении" (текст, редактируемый)
    - "Значение в Bitrix24" (Select из доступных Bitrix24 items)

### FieldPreviewDialog.tsx

Модальный предпросмотр формы — аналогичен текущему, но поддерживает все entity types.

**Содержимое:**
- Заголовок: "Предпросмотр формы: {entityTypeLabel}"
- Стандартные поля для каждого entity type (всегда присутствуют):
  - Visit: Компания, Дата визита
  - Clinic: Название компании, ИНН
  - Doctor: ФИО
  - Contact: ФИО, Тип контакта
  - NetworkClinic: Название клиники
- Кастомные поля из текущего шаблона (rendered disabled)

---

## 2. Бэкенд — изменения

### Новая модель: FormTemplate

Заменяет `VisitFormTemplate`. Поддерживает все entity types.

```python
class FormTemplate(Base):
    __tablename__ = "form_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    entity_type = Column(String, nullable=False)  # "visit", "clinic", "doctor", "contact", "network_clinic"
    fields = Column(JSONB, default=[])             # Array of FieldDefinition
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    organization = relationship("Organization")
    
    __table_args__ = (
        UniqueConstraint('organization_id', 'entity_type', name='uq_form_template_org_entity'),
    )
```

### Расширенная FieldDefinition (Pydantic)

```python
class FieldDefinition(BaseModel):
    key: str
    label: str
    type: str                                            # text, textarea, select, checkbox, date, number
    required: bool = False
    options: Optional[List[str]] = None                  # Для select
    bitrix_field_id: Optional[str] = None                # ID поля в Bitrix24
    bitrix_field_type: Optional[str] = None              # Тип поля в Bitrix24
    bitrix_value_mapping: Optional[List[dict]] = None    # [{app_value, bitrix_value}]
```

### API эндпоинты (новый роутер form_template_routers.py)

```
GET  /api/form-templates/{entity_type}     — получить шаблон формы (для текущей организации)
PUT  /api/form-templates/{entity_type}     — обновить шаблон формы (admin only)
GET  /api/admin/bitrix/fields/{entity_type} — получить доступные поля Bitrix24
```

### Миграция данных (Alembic)

1. Создать таблицу `form_templates`
2. Мигрировать данные из `visit_form_templates`:
   - Скопировать записи, добавив `entity_type = 'visit'`
   - Обогатить `fields` JSONB данными из `FieldMapping`:
     - Для каждого поля найти соответствующий FieldMapping по `app_field_name`
     - Добавить `bitrix_field_id`, `bitrix_field_type`, `bitrix_value_mapping`
3. Обновить visit_service.py для чтения маппинга из нового формата
4. Старые таблицы (`visit_form_templates`, `field_mappings`) оставить как бэкап (удалить в следующем релизе)

### Обновление visit_service.py

Метод `_sync_with_bitrix24` должен читать маппинг из `FormTemplate.fields[].bitrix_field_id` вместо таблицы `FieldMapping`:

```python
# Было: запрос к таблице FieldMapping
field_mappings = await session.execute(
    select(FieldMapping).where(...)
)

# Стало: чтение из FormTemplate
form_template = await session.execute(
    select(FormTemplate).where(
        FormTemplate.entity_type == "visit",
        FormTemplate.organization_id == org_id,
    )
)
field_mapping_dict = {
    f['key']: f.get('bitrix_field_id')
    for f in form_template.fields
    if f.get('bitrix_field_id')
}
```

---

## 3. Роутинг (Frontend)

### Новый маршрут

```tsx
// App.tsx
<Route path="admin/form-builder" element={<AdminRoute><FormBuilderPage /></AdminRoute>} />
```

### Обновление навигации

В сайдбаре заменить пункт "Форма визита" на "Редактор форм" с новой иконкой.

Старый маршрут `/admin/visit-form` — редирект на `/admin/form-builder?entity=visit`.

---

## 4. Зависимости

### Новые npm пакеты

- `@dnd-kit/core` — ядро drag-and-drop
- `@dnd-kit/sortable` — сортировка элементов списка
- `@dnd-kit/utilities` — утилиты (CSS transform)

---

## 5. Обратная совместимость

- API `/api/visit-form/` (старый) — оставить как alias для `/api/form-templates/visit` на переходный период
- Страница создания визита (`VisitCreatePage.tsx`) — обновить для использования нового API `/api/form-templates/visit`
- `visit_service.py` — обновить чтение маппинга из FormTemplate вместо FieldMapping

---

## 6. Верификация

### Тестирование

1. **Form Builder UI:**
   - Переключение между entity types (все 5 табов)
   - Добавление / редактирование / удаление полей
   - Drag-and-drop перетаскивание полей
   - Предпросмотр формы
   - Сохранение и перезагрузка страницы
   
2. **Bitrix24 интеграция:**
   - Загрузка полей Bitrix24 на вкладке "Bitrix24"
   - Выбор поля через автокомплит
   - Маппинг значений для list-полей
   - Вкладка скрыта если интеграция не подключена
   
3. **Миграция:**
   - Существующие шаблоны визитов корректно мигрированы
   - Существующие маппинги FieldMapping встроены в fields JSONB
   - Создание визита с маппингом работает через новую модель
   
4. **Обратная совместимость:**
   - Старый API `/api/visit-form/` работает
   - Страница создания визита использует новые поля формы
   - Синхронизация с Bitrix24 работает через FormTemplate

### Ручная проверка

1. Открыть `/admin/form-builder`
2. Создать поле типа "Выпадающий список" с опциями
3. Привязать его к полю Bitrix24 типа "list"
4. Настроить маппинг значений
5. Сохранить
6. Перейти на страницу создания визита
7. Убедиться что поле отображается и работает
8. Создать визит и проверить синхронизацию с Bitrix24
