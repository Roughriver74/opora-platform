# ОПОРА: Ребрендинг и удаление хардкода (Этапы 4+5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать весь хардкод бетонного бизнеса и провести полный ребрендинг Beton CRM → ОПОРА.

**Architecture:** Эволюционный подход — поэтапная замена текстов, цветов, конфигов и Docker-настроек. Все изменения обратно-совместимы, старые данные в БД продолжают работать. Каждая задача — самодостаточный коммит.

**Tech Stack:** TypeScript, React, Material-UI, Express, TypeORM, Docker Compose, PostgreSQL, Redis

**Spec:** `docs/superpowers/specs/2026-03-22-opora-platform-design.md`

---

## Файловая карта

### Изменяемые файлы (по задачам)

**Задача 1 — Docker и инфраструктура:**
- `docker-compose.yml` — контейнеры `beton_*` → `opora_*`, сеть, БД
- `server/src/database/config/database.config.ts` — дефолтные DB credentials
- `server/src/services/cacheService.ts` — Redis prefix
- `server/src/config/config.ts` — app name, URLs
- `.env` (root) — переменные
- `server/.env` — переменные
- `scripts/start.sh`, `scripts/stop.sh`, `scripts/logs.sh` — если ссылаются на beton

**Задача 2 — package.json и мета:**
- `package.json` (root) — name, description
- `client/public/manifest.json` — name, short_name, theme_color, description
- `client/public/index.html` — title, meta tags, theme-color

**Задача 3 — Тема и цвета:**
- `client/src/theme.ts` — primary color #4c1130
- `client/src/components/layout/Layout.tsx` — footer background, copyright
- `client/src/components/dashboard/DashboardStats.tsx` — hardcoded #4c1130
- `client/src/components/dashboard/DashboardInsights.tsx` — hardcoded #4c1130
- `client/src/components/dashboard/DashboardCharts.tsx` — hardcoded #4c1130
- `client/src/services/dashboardService.ts` — hardcoded #4c1130

**Задача 4 — UI тексты:**
- `client/src/components/auth/LoginForm/index.tsx` — "CRM Platform"
- `client/src/components/layout/Layout.tsx` — footer "CRM Platform"
- `client/src/hooks/useFormLoader.ts` — "заказа бетона"
- `server/src/app.ts` — "Beton CRM API"
- `server/src/controllers/organizationController.ts` — default companyName
- `server/src/controllers/cronController.ts` — комментарий
- `server/server/src/config/swagger.ts` — API docs title/description

**Задача 5 — Логотипы:**
- `client/public/logo.svg` — заменить
- `client/public/favicon.svg` — заменить
- `client/public/favicon.ico` — заменить
- `client/public/logo192.svg` — заменить
- `client/public/logo512.svg` — заменить
- `client/public/logo-light-bg.svg` — заменить
- `client/public/logo-with-text.svg` — заменить
- `client/src/logo.svg` — заменить
- `client/src/components/common/Logo.tsx` — цвета
- `client/src/components/common/AnimatedLogo.tsx` — цвета

**Задача 6 — Хардкод номенклатуры:**
- `client/src/components/admin/Settings/MaterialFieldsConfigEditor.tsx` — дефолт "Бетон"
- `client/src/components/user/MySubmissions/index.tsx` — комментарии про бетон/раствор/ЦПС
- `client/src/components/admin/Nomenclature/components/CategoryManager.tsx` — placeholder 'BETON'
- `server/src/services/optimizedSubmissionService.ts` — комментарий про бетон/цемент
- `server/src/services/NomenclatureService.ts` — комментарии про бетон, м³
- `server/src/services/NomenclatureExcelService.ts` — примеры BETON-V25, BETON-V30

**Задача 7 — Elasticsearch:**
- `server/src/services/elasticsearchService.ts` — индекс 'beton_crm_search'
- `server/src/controllers/searchController.ts` — индекс 'beton_crm_search'

**Задача 8 — Тесты:**
- `tests/setup.spec.ts` — email
- `tests/comprehensive-report.spec.ts` — email, report title
- `tests/auth/authentication.spec.ts` — email
- `tests/users/user-management.spec.ts` — email
- `tests/submissions/submissions.spec.ts` — email
- `tests/api/api-endpoints.spec.ts` — email
- `tests/docker/docker-environment.spec.ts` — container names
- `tests/utils/docker-utils.ts` — container/DB references

**Задача 9 — Скрипты и утилиты (низкий приоритет):**
- `server/src/scripts/testEncryption.ts` — URL betonexpress
- `server/src/scripts/reindexWithBitrixId.ts` — query 'бетон'
- `server/src/scripts/testIncrementalSync.ts` — query 'бетон'
- `server/src/scripts/syncBitrixToElasticsearch.ts` — queries
- `server/src/controllers/backupController.ts` — backup dir path
- `server/src/controllers/authController.ts` — test user email

**НЕ трогаем (исторические данные):**
- `server/src/database/migrations/data/backup-import/*.json` — legacy backup data
- `server/src/database/migrations/1758000000000-*.ts` — комментарий, не влияет на логику
- `blog-article.html` — статический контент, не часть приложения
- `grafana.json` — отдельная инфраструктура, обновляется при деплое

---

## Task 1: Docker и инфраструктурные конфиги

**Files:**
- Modify: `docker-compose.yml`
- Modify: `server/src/database/config/database.config.ts`
- Modify: `server/src/services/cacheService.ts`
- Modify: `server/src/config/config.ts`

- [ ] **Step 1: Обновить docker-compose.yml — контейнеры и сеть**

Заменить все `beton_` на `opora_`, `beton_network` → `opora_network`, DB credentials:

```yaml
# Было:
container_name: beton_postgres
POSTGRES_DB: beton_crm
POSTGRES_USER: beton_user
beton_network

# Стало:
container_name: opora_postgres
POSTGRES_DB: opora
POSTGRES_USER: opora_user
opora_network
```

Все вхождения в файле: контейнеры (postgres, redis, elasticsearch, backend, frontend, promtail, node_exporter, cadvisor), environment vars, networks.

- [ ] **Step 2: Обновить database.config.ts — дефолты**

```typescript
// Было:
username: process.env.DB_USERNAME || 'beton_user',
password: process.env.DB_PASSWORD || 'beton_password',
database: process.env.DB_NAME || 'beton_crm',

// Стало:
username: process.env.DB_USERNAME || 'opora_user',
password: process.env.DB_PASSWORD || 'opora_password',
database: process.env.DB_NAME || 'opora',
```

- [ ] **Step 3: Обновить cacheService.ts — Redis prefix**

```typescript
// Было:
defaultPrefix = 'beton-crm'

// Стало:
defaultPrefix = 'opora'
```

- [ ] **Step 4: Обновить config.ts — app name**

```typescript
// Было:
'beton-crm-production'
// и URL betonexpress.pro

// Стало:
'opora-production'
// URL оставить пустым или убрать дефолт (берётся из env)
```

- [ ] **Step 5: Обновить .env файлы**

Root `.env`:
```
PGADMIN_EMAIL=admin@opora.local
JWT_SECRET=opora-secret-key-change-me-in-production-8742
```

Server `.env`:
```
DB_USERNAME=opora_user
DB_PASSWORD=opora_password
DB_NAME=opora
JWT_SECRET=opora-secret-key-change-me-in-production-8742
```

**Примечание:** BITRIX24_WEBHOOK_URL оставляем как есть — это реальные учётные данные клиента, не бренд.

- [ ] **Step 6: Проверить что проект запускается**

⚠ **ВАЖНО:** Переименование БД из `beton_crm` → `opora` означает создание НОВОЙ пустой БД. Если в текущей `beton_crm` есть нужные данные, сначала сделай бэкап:

```bash
# Бэкап старой БД (если нужно сохранить данные):
docker compose exec beton_postgres pg_dump -U beton_user beton_crm > backup_beton_crm.sql
```

**НЕ перезапускаем контейнеры сейчас** — сначала нужно обновить тесты (Task 8), иначе они будут ссылаться на старые имена `beton_*`. Перезапуск делаем в Task 11 (финальная верификация).

- [ ] **Step 7: Коммит**

```bash
git add docker-compose.yml server/src/database/config/database.config.ts server/src/services/cacheService.ts server/src/config/config.ts .env server/.env
git commit -m "refactor: rename infrastructure from beton-crm to opora

Docker containers, database, Redis prefix, and config defaults
now use 'opora' naming instead of 'beton'."
```

⚠ После этого коммита контейнеры ещё НЕ перезапущены. Старые `beton_*` контейнеры работают. Перезапуск — в Task 11.

---

## Task 2: package.json и мета-файлы

**Files:**
- Modify: `package.json` (root)
- Modify: `client/public/manifest.json`
- Modify: `client/public/index.html`

- [ ] **Step 1: Обновить root package.json**

```json
{
  "name": "opora-platform",
  "description": "ОПОРА — Облачная Платформа Организации Рабочих Активностей"
}
```

- [ ] **Step 2: Обновить manifest.json**

```json
{
  "short_name": "ОПОРА",
  "name": "ОПОРА — Платформа Организации Рабочих Активностей",
  "description": "Облачная платформа для управления заказами и визитами полевых сотрудников"
}
```

`theme_color` пока оставить `#4c1130` — будет заменён в Task 3.

- [ ] **Step 3: Обновить index.html**

```html
<title>ОПОРА</title>
<meta name="description" content="ОПОРА — Облачная Платформа Организации Рабочих Активностей" />
<meta name="keywords" content="CRM, заказы, визиты, управление, полевые сотрудники" />
<meta name="apple-mobile-web-app-title" content="ОПОРА" />
```

`theme-color` meta тоже пока оставить — Task 3.

- [ ] **Step 4: Коммит**

```bash
git add package.json client/public/manifest.json client/public/index.html
git commit -m "refactor: rebrand meta files to ОПОРА

Update package.json name/description, PWA manifest,
and HTML meta tags."
```

---

## Task 3: Тема и цвета

**Files:**
- Modify: `client/src/theme.ts`
- Modify: `client/src/components/layout/Layout.tsx`
- Modify: `client/src/components/dashboard/DashboardStats.tsx`
- Modify: `client/src/components/dashboard/DashboardInsights.tsx`
- Modify: `client/src/components/dashboard/DashboardCharts.tsx`
- Modify: `client/src/services/dashboardService.ts`
- Modify: `client/public/manifest.json` (theme_color)
- Modify: `client/public/index.html` (theme-color meta)

- [ ] **Step 1: Определить новые цвета ОПОРА**

Новая палитра (надёжная, корпоративная):
- Primary: `#1B4965` (тёмно-синий, надёжность)
- Accent: `#5FA8D3` (светло-синий, дружелюбность)
- Заменяет: `#4c1130` → `#1B4965`, `#54C3C3` → `#5FA8D3`

**Примечание:** Цвета можно поменять позже через Organization.settings.branding. Сейчас ставим дефолтные для платформы.

- [ ] **Step 2: Обновить theme.ts**

```typescript
// Было:
primary: { main: '#4c1130' }

// Стало:
primary: { main: '#1B4965' }
```

- [ ] **Step 3: Обновить Layout.tsx**

```typescript
// Было:
backgroundColor: '#4c1130'
// и текст "CRM Platform"

// Стало:
backgroundColor: '#1B4965'
// и текст "ОПОРА"
```

- [ ] **Step 4: Обновить Dashboard компоненты**

Во всех файлах заменить `#4c1130` → `theme.palette.primary.main` (использовать тему вместо хардкода):

- `DashboardStats.tsx:61,127` — заменить `'#4c1130'` на `theme.palette.primary.main`
- `DashboardInsights.tsx:62` — аналогично
- `DashboardCharts.tsx:31,107` — аналогично
- `dashboardService.ts:75` — аналогично

Это правильнее, чем просто менять цвет — теперь при смене темы всё обновится автоматически.

- [ ] **Step 5: Обновить manifest.json и index.html**

```json
// manifest.json
"theme_color": "#1B4965"
```

```html
<!-- index.html -->
<meta name="theme-color" content="#1B4965" />
```

- [ ] **Step 6: Визуальная проверка**

Запустить фронтенд, проверить:
- Шапка — новый цвет
- Футер — новый цвет, текст "ОПОРА"
- Дашборд — графики в новых цветах
- Нет остатков `#4c1130` в UI

```bash
grep -r "#4c1130" client/src/ --include="*.tsx" --include="*.ts"
```

Ожидаем: 0 результатов.

- [ ] **Step 7: Коммит**

```bash
git add client/src/theme.ts client/src/components/layout/Layout.tsx \
  client/src/components/dashboard/ client/src/services/dashboardService.ts \
  client/public/manifest.json client/public/index.html
git commit -m "refactor: replace hardcoded colors with ОПОРА theme

New palette: primary #1B4965, accent #5FA8D3.
Dashboard components now use theme instead of hardcoded values."
```

---

## Task 4: UI тексты

**Files:**
- Modify: `client/src/components/auth/LoginForm/index.tsx`
- Modify: `client/src/hooks/useFormLoader.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/controllers/organizationController.ts`
- Modify: `server/src/controllers/cronController.ts`
- Modify: `server/server/src/config/swagger.ts`

- [ ] **Step 1: Обновить LoginForm**

```typescript
// Было:
"Введите пароль для доступа к системе CRM Platform"

// Стало:
"Введите данные для входа в ОПОРА"
```

- [ ] **Step 2: Обновить useFormLoader.ts**

```typescript
// Было:
"Нет активных форм для заказа бетона"

// Стало:
"Нет активных форм"
```

- [ ] **Step 3: Обновить server/src/app.ts**

```typescript
// Было:
"Beton CRM API работает"

// Стало:
"OPORA API работает"
```

- [ ] **Step 4: Обновить organizationController.ts**

```typescript
// Было (строки 192, 217):
companyName: 'CRM Platform'

// Стало:
companyName: 'ОПОРА'
```

- [ ] **Step 5: Обновить cronController.ts**

```typescript
// Было:
"# Инкрементальная синхронизация Beton CRM"

// Стало:
"# Инкрементальная синхронизация OPORA"
```

- [ ] **Step 6: Обновить swagger.ts**

```typescript
// Было:
title: "Beton CRM API"
description: "системы управления заказами бетона"
contact: { email: 'crm@betonexpress.pro' }

// Стало:
title: "OPORA API"
description: "API платформы ОПОРА для управления заказами и визитами"
contact: { name: 'ОПОРА Support', email: 'support@opora.ru' }
```

- [ ] **Step 7: Проверка — grep на остатки**

```bash
grep -ri "beton crm\|crm platform\|betonexpress\|бетонэкспресс" client/src/ server/src/ \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=migrations --exclude-dir=scripts
```

Ожидаем: 0 результатов (за исключением migrations и scripts).

- [ ] **Step 8: Коммит**

```bash
git add client/src/components/auth/LoginForm/index.tsx client/src/hooks/useFormLoader.ts \
  server/src/app.ts server/src/controllers/organizationController.ts \
  server/src/controllers/cronController.ts server/server/src/config/swagger.ts
git commit -m "refactor: rebrand UI text from Beton CRM to ОПОРА

Login page, API health, swagger docs, and default org settings
now reference ОПОРА instead of Beton CRM / CRM Platform."
```

---

## Task 5: Логотипы

**Files:**
- Replace: `client/public/logo.svg`
- Replace: `client/public/favicon.svg`
- Replace: `client/public/favicon.ico`
- Replace: `client/public/logo192.svg`
- Replace: `client/public/logo512.svg`
- Replace: `client/public/logo-light-bg.svg`
- Replace: `client/public/logo-with-text.svg`
- Replace: `client/src/logo.svg`
- Modify: `client/src/components/common/Logo.tsx`
- Modify: `client/src/components/common/AnimatedLogo.tsx`

- [ ] **Step 1: Создать новые SVG логотипы**

Создать минималистичный логотип ОПОРА — щит/колонна (символ опоры, надёжности) в цветах `#1B4965` и `#5FA8D3`.

Варианты:
- `logo.svg` — основной логотип (иконка)
- `favicon.svg` — упрощённая иконка 16x16
- `logo192.svg` — PWA 192x192
- `logo512.svg` — PWA 512x512
- `logo-light-bg.svg` — для светлого фона
- `logo-with-text.svg` — логотип + текст "ОПОРА"

- [ ] **Step 2: Сгенерировать favicon.ico из SVG**

```bash
# Если установлен imagemagick:
convert client/public/favicon.svg -resize 32x32 client/public/favicon.ico
```

Или использовать онлайн-конвертер.

- [ ] **Step 3: Обновить Logo.tsx и AnimatedLogo.tsx**

Заменить цвета `#54C3C3` → `#5FA8D3` и `#3a9a9a` → `#1B4965` (или пересмотреть если меняется форма логотипа).

- [ ] **Step 4: Скопировать logo.svg в client/src/**

```bash
cp client/public/logo.svg client/src/logo.svg
```

- [ ] **Step 5: Визуальная проверка**

- Вкладка браузера — новый favicon
- Логин — новый логотип
- Шапка — новый логотип
- PWA install prompt — корректные иконки

- [ ] **Step 6: Коммит**

```bash
git add client/public/ client/src/logo.svg \
  client/src/components/common/Logo.tsx \
  client/src/components/common/AnimatedLogo.tsx
git commit -m "refactor: replace logos with ОПОРА branding

New SVG logos in ОПОРА color scheme (#1B4965, #5FA8D3).
Updated Logo and AnimatedLogo components."
```

---

## Task 6: Удалить хардкод номенклатуры бетона

**Files:**
- Modify: `client/src/components/admin/Settings/MaterialFieldsConfigEditor.tsx`
- Modify: `client/src/components/user/MySubmissions/index.tsx`
- Modify: `client/src/components/admin/Nomenclature/components/CategoryManager.tsx`
- Modify: `server/src/services/optimizedSubmissionService.ts`
- Modify: `server/src/services/NomenclatureService.ts`
- Modify: `server/src/services/NomenclatureExcelService.ts`

- [ ] **Step 1: Обновить MaterialFieldsConfigEditor.tsx**

Убрать дефолт "Бетон" из `label`. Заменить на пустой шаблон:

```typescript
// Было:
{ key: 'concrete', label: 'Бетон', ... }

// Стало:
{ key: 'material_1', label: '', ... }
```

Или лучше — пустой массив дефолтов, пользователь сам добавляет через UI.

- [ ] **Step 2: Обновить MySubmissions/index.tsx**

Убрать комментарии и ссылки на "бетон, раствор, ЦПС" (строки 360, 717, 878). Заменить на универсальные:

```typescript
// Было (комментарии):
// Поля для бетона, раствора, ЦПС

// Стало (убрать или заменить):
// Поля материалов
```

- [ ] **Step 3: Обновить CategoryManager.tsx**

```typescript
// Было:
placeholder='BETON'

// Стало:
placeholder='CATEGORY_CODE'
```

- [ ] **Step 4: Обновить optimizedSubmissionService.ts**

```typescript
// Было (строка 16):
// ключевые слова для поиска полей с товарами в label (например ['бетон', 'цемент'])

// Стало:
// ключевые слова для поиска полей с товарами в label (настраивается per организация)
```

- [ ] **Step 5: Обновить NomenclatureService.ts**

```typescript
// Было:
// Получаем единицу измерения по умолчанию (м³ для бетона)

// Стало:
// Получаем единицу измерения по умолчанию
```

- [ ] **Step 6: Обновить NomenclatureExcelService.ts**

Убрать примеры `BETON-V25`, `BETON-V30`, `Бетон` из кода (строки 79-100). Заменить на универсальные примеры:

```typescript
// Было:
// Пример: 'BETON-V25', 'BETON-V30'

// Стало:
// Пример: 'PROD-001', 'PROD-002'
```

- [ ] **Step 7: Проверка**

```bash
grep -ri "бетон\|beton\|раствор\|цпс\|keramzit" client/src/ server/src/ \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=migrations --exclude-dir=scripts --exclude-dir=backup-import
```

Ожидаем: 0 результатов (за исключением исторических миграций и скриптов).

- [ ] **Step 8: Коммит**

```bash
git add client/src/components/admin/Settings/MaterialFieldsConfigEditor.tsx \
  client/src/components/user/MySubmissions/index.tsx \
  client/src/components/admin/Nomenclature/components/CategoryManager.tsx \
  server/src/services/optimizedSubmissionService.ts \
  server/src/services/NomenclatureService.ts \
  server/src/services/NomenclatureExcelService.ts
git commit -m "refactor: remove hardcoded concrete nomenclature

Replace бетон/раствор/ЦПС defaults with generic placeholders.
Nomenclature is now fully configurable per organization."
```

---

## Task 7: Elasticsearch индексы

**Files:**
- Modify: `server/src/services/elasticsearchService.ts`
- Modify: `server/src/controllers/searchController.ts`

- [ ] **Step 1: Обновить elasticsearchService.ts**

```typescript
// Было:
indexName = 'beton_crm_search'
aliasName = 'beton_crm_search_alias'

// Стало:
indexName = 'opora_search'
aliasName = 'opora_search_alias'
```

Также убрать комментарий "Получение названия бетона по ID" → "Получение названия товара по ID".

- [ ] **Step 2: Обновить searchController.ts**

```typescript
// Было:
indexName: 'beton_crm_search'

// Стало:
indexName: 'opora_search'
```

- [ ] **Step 3: Документировать решение по ES в Docker**

⚠ Elasticsearch используется, но НЕ включён в docker-compose.yml для dev-окружения. Варианты:
1. Добавить ES в docker-compose.yml
2. Сделать поисковую функциональность опциональной (fallback на SQL LIKE)

Это не блокирует ребрендинг — просто переименовываем индексы. Решение по инфраструктуре ES — отдельная задача.

- [ ] **Step 4: Коммит**

```bash
git add server/src/services/elasticsearchService.ts server/src/controllers/searchController.ts
git commit -m "refactor: rename elasticsearch index to opora_search

Replace beton_crm_search index name with opora_search."
```

---

## Task 8: Тесты

**Files:**
- Modify: `tests/setup.spec.ts`
- Modify: `tests/comprehensive-report.spec.ts`
- Modify: `tests/auth/authentication.spec.ts`
- Modify: `tests/users/user-management.spec.ts`
- Modify: `tests/submissions/submissions.spec.ts`
- Modify: `tests/api/api-endpoints.spec.ts`
- Modify: `tests/docker/docker-environment.spec.ts`
- Modify: `tests/utils/docker-utils.ts`

- [ ] **Step 1: Обновить email-адреса в тестах**

Во всех тестовых файлах:

```typescript
// Было:
email: 'crm@betonexpress.pro'
email: 'admin@betoncrm.ru'
email: 'admin@beton.com'

// Стало:
email: 'admin@opora.local'
```

Файлы: `setup.spec.ts`, `comprehensive-report.spec.ts`, `authentication.spec.ts`, `user-management.spec.ts`, `submissions.spec.ts`, `api-endpoints.spec.ts`.

- [ ] **Step 2: Обновить report title**

```typescript
// comprehensive-report.spec.ts
// Было:
"BETON CRM - COMPREHENSIVE SYSTEM HEALTH REPORT"

// Стало:
"OPORA - COMPREHENSIVE SYSTEM HEALTH REPORT"
```

- [ ] **Step 3: Обновить Docker references в тестах**

`docker-environment.spec.ts`:
```typescript
// Было:
'beton_postgres', 'beton_redis', 'beton_backend', 'beton_frontend'

// Стало:
'opora_postgres', 'opora_redis', 'opora_backend', 'opora_frontend'
```

`docker-utils.ts`:
```typescript
// Было:
container references with 'beton_' and DB name 'beton_crm'

// Стало:
'opora_' and 'opora'
```

- [ ] **Step 4: Запустить тесты**

```bash
npm test
```

Ожидаем: тесты проходят (или фейлятся только из-за того, что контейнеры ещё не перезапущены с новыми именами).

- [ ] **Step 5: Коммит**

```bash
git add tests/
git commit -m "refactor: update test fixtures for ОПОРА rebrand

Replace beton email addresses, container names, and report
titles with opora equivalents."
```

---

## Task 9: Скрипты и утилиты (cleanup)

**Files:**
- Modify: `server/src/scripts/testEncryption.ts`
- Modify: `server/src/scripts/reindexWithBitrixId.ts`
- Modify: `server/src/scripts/testIncrementalSync.ts`
- Modify: `server/src/scripts/syncBitrixToElasticsearch.ts`
- Modify: `server/src/controllers/backupController.ts`
- Modify: `server/src/controllers/authController.ts`

- [ ] **Step 1: Обновить скрипты — убрать betonexpress URL и бетонные примеры**

`testEncryption.ts`:
```typescript
// Убрать захардкоженный URL betonexpress — вместо этого брать из env
const webhookUrl = process.env.BITRIX24_WEBHOOK_URL || '';
```

`reindexWithBitrixId.ts`, `testIncrementalSync.ts`, `syncBitrixToElasticsearch.ts`:
```typescript
// Было:
query: 'бетон'
query: 'бетн м300'
query: 'цемент'

// Стало:
query: 'тест'
// или убрать хардкоженные тестовые запросы
```

- [ ] **Step 2: Обновить backupController.ts**

```typescript
// Было:
PROD_BACKUP_DIR = '/var/www/beton-crm-backups'

// Стало:
PROD_BACKUP_DIR = '/var/www/opora-backups'
```

- [ ] **Step 3: Обновить authController.ts — тестовый пользователь**

```typescript
// Было:
email: 'admin@beton.com'

// Стало:
email: 'admin@opora.local'
```

- [ ] **Step 4: Финальная проверка**

```bash
# Поиск оставшихся вхождений beton (исключаем историю и бэкапы)
grep -ri "beton" server/src/ client/src/ tests/ \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=migrations --exclude-dir=backup-import --exclude-dir=node_modules
```

Ожидаем: 0 результатов, или только безобидные вхождения в комментариях миграций.

- [ ] **Step 5: Коммит**

```bash
git add server/src/scripts/ server/src/controllers/backupController.ts \
  server/src/controllers/authController.ts
git commit -m "refactor: clean up remaining beton references in scripts

Update test scripts, backup paths, and test user email."
```

---

## Task 10: Кастомный брендинг per организация (Spec 5.5)

**Files:**
- Modify: `server/src/database/entities/Organization.entity.ts` — добавить `faviconUrl` в BrandingConfig
- Create: `server/src/database/migrations/XXXXXXXXX-AddFaviconUrlToBranding.ts` — миграция
- Modify: `client/src/theme.ts` — читать primaryColor из org config
- Modify: `client/src/components/layout/Layout.tsx` — динамический логотип и название

- [ ] **Step 1: Обновить OrganizationSettings interface**

В `Organization.entity.ts` добавить `faviconUrl` в branding:

```typescript
// Текущий branding:
branding?: {
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
};

// Добавить:
branding?: {
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;  // NEW
};
```

- [ ] **Step 2: Создать миграцию**

Миграция не требует ALTER TABLE — `branding` хранится в JSONB колонке `settings`. Но нужно обновить дефолтные значения для существующих организаций:

```typescript
// migration
public async up(queryRunner: QueryRunner): Promise<void> {
  // Установить дефолтный faviconUrl для существующих организаций
  await queryRunner.query(`
    UPDATE organizations
    SET settings = jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{branding,faviconUrl}',
      '"/favicon.svg"'
    )
    WHERE settings->'branding' IS NOT NULL
      AND settings->'branding'->'faviconUrl' IS NULL
  `);
}
```

- [ ] **Step 3: Фронтенд — применять branding организации**

В Layout.tsx и theme.ts: если у организации есть `branding.primaryColor`, использовать его вместо дефолтного `#1B4965`. Free-план всегда использует дефолт ОПОРА, Pro — кастомные значения.

```typescript
// Логика в Layout или theme provider:
const orgConfig = useOrgConfig(); // из GET /api/organizations/current/config
const primaryColor = orgConfig?.branding?.primaryColor || '#1B4965';
const companyName = orgConfig?.branding?.companyName || 'ОПОРА';
const logoUrl = orgConfig?.branding?.logoUrl || '/logo.svg';
```

- [ ] **Step 4: Проверка**

1. Организация без кастомного брендинга → цвета ОПОРА
2. Организация с `branding.primaryColor = '#FF0000'` → красная тема
3. Free-план → всегда дефолт ОПОРА (кастомный брендинг игнорируется)

- [ ] **Step 5: Коммит**

```bash
git add server/src/database/entities/Organization.entity.ts \
  server/src/database/migrations/ \
  client/src/theme.ts client/src/components/layout/Layout.tsx
git commit -m "feat: add custom branding per organization (Pro plan)

Organizations can now customize primaryColor, logoUrl, faviconUrl.
Free plan always shows default ОПОРА branding."
```

---

## Task 11: Финальная верификация

- [ ] **Step 1: Полный поиск оставшихся ссылок**

```bash
# Проверяем ВСЁ
grep -ri "beton\|бетон\|betonexpress\|бетонэкспресс" . \
  --include="*.ts" --include="*.tsx" --include="*.json" --include="*.html" --include="*.yml" --include="*.yaml" --include="*.svg" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=backup-import \
  --exclude-dir=migrations/data | grep -v "Binary"
```

Допустимые остатки:
- `migrations/data/backup-import/` — исторические данные
- `migrations/*.ts` — комментарии в старых миграциях
- `blog-article.html` — статический контент
- `grafana.json` — мониторинг (обновляется при деплое)

- [ ] **Step 2: Запустить проект и проверить**

```bash
cd scripts && ./stop.sh && ./start.sh
```

Чек-лист:
- [ ] Все контейнеры стартуют с именами `opora_*`
- [ ] БД `opora` создана, миграции прошли
- [ ] Фронтенд открывается, title "ОПОРА"
- [ ] Логин работает
- [ ] Шапка — новый цвет и текст
- [ ] Футер — "© ОПОРА"
- [ ] Дашборд — новые цвета в графиках
- [ ] PWA manifest — "ОПОРА"
- [ ] API health endpoint — "OPORA API работает"

- [ ] **Step 3: Запустить тесты**

```bash
npm test
```

- [ ] **Step 4: Финальный коммит (если были мелкие фиксы)**

```bash
git add -A
git commit -m "fix: final cleanup after ОПОРА rebrand"
```
