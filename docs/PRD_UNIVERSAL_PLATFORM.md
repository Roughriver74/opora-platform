# PRD: Универсальная SaaS-платформа для производителей и дистрибьюторов

## Контекст

Beton CRM — система заказов, захардкоженная под бетонный бизнес. Цель — универсальная мультитенантная SaaS-платформа для производителей любых направлений, работающих с дистрибьюторами.

**Архитектурные решения:**

- Одна БД, разделение по `organization_id`
- Регистрация клиентов через суперадмина
- Начинаем с чистого листа (старые данные не мигрируем)
- Bitrix24 — опциональная интеграция, не обязательная

---

## Этап 1: Мультитенантный фундамент ✅ ВЫПОЛНЕН

Entities, миграция, middleware, JWT, API организаций, фронтенд (OrganizationSelector, Navbar, админ-панель).

---

## Этап 2: Подключить organizationId в сервисы и контроллеры ❌ НЕ ВЫПОЛНЕН

**Проблема:** Entities получили `organizationId`, но сервисы и контроллеры его НЕ используют. Данные создаются без привязки к организации → изоляция не работает.

### 2.1 Контроллеры — передавать `req.organizationId` в сервисы

Файлы:

- `server/src/controllers/formController.ts` — при create/update/list передавать orgId
- `server/src/controllers/submissionController.ts` — при submit/list
- `server/src/controllers/optimizedSubmissionController.ts` — при list/stats
- `server/src/controllers/companyController.ts` — при CRUD
- `server/src/controllers/contactController.ts` — при CRUD
- `server/src/controllers/nomenclatureController.ts` — при CRUD
- `server/src/controllers/settingsController.ts` — при get/set

### 2.2 Сервисы — фильтровать по organizationId

Файлы:

- `server/src/services/FormService.ts` — findAll/create/update с orgId
- `server/src/services/SubmissionService.ts` — findAll/create с orgId
- `server/src/services/optimizedSubmissionService.ts` — buildQuery с orgId WHERE
- `server/src/services/CompanyService.ts` — CRUD с orgId
- `server/src/services/ContactService.ts` — через company.organizationId
- `server/src/services/NomenclatureService.ts` — CRUD с orgId
- `server/src/services/SettingsService.ts` — get/set с orgId (nullable для глобальных)
- `server/src/services/CacheService.ts` — orgId в ключ кеша: `${prefix}:${orgId}:${id}`

### 2.3 Подключить tenantMiddleware в app.ts

В `server/src/app.ts` после `authMiddleware` добавить `tenantMiddleware` для protected routes.

---

## Этап 3: Bitrix24 как опция ❌ НЕ ВЫПОЛНЕН

**Проблема:** Система полностью завязана на Bitrix24. Новому клиенту без Битрикса пользоваться невозможно.

### 3.1 Флаг включения Bitrix24 per организация

В `Organization.settings` добавить:

```json
{
  "bitrixEnabled": false,
  "bitrixWebhookUrl": null,
  "bitrixDealCategory": null
}
```

### 3.2 Условная синхронизация

Файлы для изменения:

- `server/src/services/bitrix24Service.ts` — проверять `org.settings.bitrixEnabled` перед любым вызовом
- `server/src/controllers/formController.ts:422` — условно создавать сделку в Bitrix24
- `server/src/controllers/submissionController.ts` — условно синхронизировать статусы
- `server/src/queue/SubmissionQueueWorker.ts:312` — пропускать Bitrix-шаги если отключён
- `server/src/services/submissionSyncService.ts` — весь модуль обернуть в проверку

### 3.3 Динамический маппинг полей Bitrix24

Сейчас захардкожено в `submissionSyncService.ts`:

```text
material → UF_CRM_MATERIAL
volume → UF_CRM_VOLUME
deliveryAddress → UF_CRM_DELIVERY_ADDRESS
```

Перенести в `Organization.settings.bitrixFieldMapping`:

```json
{
  "bitrixFieldMapping": {
    "material": "UF_CRM_MATERIAL",
    "volume": "UF_CRM_VOLUME"
  }
}
```

### 3.4 Убрать захардкоженные UF_ поля

Файлы:

- `server/src/controllers/formController.ts:422` — `UF_CRM_1750107484181` → из настроек
- `server/src/queue/SubmissionQueueWorker.ts:312,316` — `UF_CRM_1750107484181`, `UF_CRM_1760208480` → из настроек
- `server/src/controllers/submissionController.ts:1174-1196` — `/check-field/:dealId` → динамический ID поля

### 3.5 Динамические статусы сделок

Сейчас: `C1:NEW`, `C1:WON`, `C1:LOSE`, `C1:UC_GJLIZP`

Перенести в `Organization.settings.bitrixStatuses`:

```json
{
  "bitrixStatuses": {
    "new": "C1:NEW",
    "won": "C1:WON",
    "lost": "C1:LOSE"
  }
}
```

Файлы:

- `server/src/database/entities/Submission.entity.ts:293` — `isCompleted()` использовать из настроек
- `server/src/services/optimizedSubmissionService.ts:474` — статусы из настроек
- `client/src/components/user/MySubmissions/constants.ts` — STATUS_COLORS/LABELS из API

---

## Этап 4: Убрать хардкод бетонной номенклатуры ❌ НЕ ВЫПОЛНЕН

### 4.1 Миграция без seed-данных бетона

Файл: `server/src/database/migrations/1758000000000-CreateNomenclatureTables.ts`

Категории BETON, RASTVORY, KERAMZITOBETON, NASOS и т.д. — убрать из миграции. Вместо этого:

- Создавать пустые таблицы
- Категории добавляются через админ-панель организации
- Для демо/онбординга: скрипт seed-данных (не в миграции)

### 4.2 Убрать material_fields_config

Сейчас в `SettingsService.ts` и `MaterialFieldsConfigEditor.tsx`:

```text
concrete: { label: 'Бетон', fields: [...], volumeFields: [...] }
mortar: { label: 'Раствор', ... }
cps: { label: 'ЦПС', ... }
```

Заменить на динамическую конфигурацию per организация в `Organization.settings.materialConfig` — произвольное количество категорий, не 3 захардкоженных.

Файлы:

- `server/src/services/SettingsService.ts:195-230` — убрать defaultConfig
- `server/src/services/optimizedSubmissionService.ts:519-524` — убрать SQL с '%бетон%'
- `client/src/components/admin/Settings/MaterialFieldsConfigEditor.tsx:38-57` — динамический список
- `client/src/components/user/MySubmissions/index.tsx:71-111` — брать конфиг из API

### 4.3 Убрать захардкоженные field_* ID

15+ конкретных field ID разбросаны по коду:

- `server/src/services/SettingsService.ts` — field_1750264442280 и другие (10+ штук)
- `server/src/services/optimizedSubmissionService.ts:162-169` — field_1750311865385, field_1750266840204
- `server/src/services/PeriodSubmissionService.ts:231` — field_1750311670121
- `client/src/components/user/MySubmissions/index.tsx:74-110` — все field_* для материалов

Решение: все field ID хранятся в `Organization.settings` или в `Settings` таблице per организация.

### 4.4 Elasticsearch синонимы

Файл: `server/src/services/elasticsearchService.ts:558-581`

Сейчас: `'бетон,цемент,смесь'`, `'в25,в-25'`, `'м300,м-300'` и т.д.

Решение: синонимы загружать из `Settings` per организация. Или убрать вообще (они нужны только для бетонного бизнеса).

---

## Этап 5: Убрать хардкод брендинга ❌ НЕ ВЫПОЛНЕН

### 5.1 Тексты UI

| Файл | Что убрать |
| ---- | ---------- |
| `client/src/pages/HomePage.tsx:51,54` | "Заказ бетона", "заявки на поставку бетона" |
| `client/src/hooks/useFormLoader.ts:87` | "Нет активных форм для заказа бетона" |
| `client/src/components/layout/Layout.tsx` | "БетонЭкспресс" |
| `client/src/components/auth/LoginForm/index.tsx:40` | "Beton CRM" |

Решение: брать из `Organization.settings.branding` или из генерик текстов.

### 5.2 Meta-данные и PWA

| Файл | Что убрать |
| ---- | ---------- |
| `client/public/index.html` | title, description, keywords, apple-mobile-web-app-title |
| `client/public/manifest.json` | short_name, name, description |

Решение: генерировать index.html на сервере с подстановкой из Organization, или использовать генерик тексты.

### 5.3 Логотипы и цвета

- 8 SVG/ICO файлов в `client/public/` — специфичны для БетонЭкспресс
- Цвета `#54C3C3`, `#4c1130` в 10+ файлах
- `client/src/theme.ts` — primary/secondary colors

Решение: тема загружается из `Organization.settings.theme` (primaryColor, secondaryColor, logoUrl).
