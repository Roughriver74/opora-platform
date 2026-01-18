# PRD: Изоляция системы Beton CRM

## Версия документа
- **Версия**: 1.0
- **Дата**: 2026-01-17
- **Автор**: AI Assistant

---

## 1. Обзор проекта

### 1.1 Цель
Переработать архитектуру Beton CRM для обеспечения **полной автономной работы** без обязательных внешних зависимостей. Интеграции с Bitrix24 и Elasticsearch должны стать **опциональными модулями**, которые можно включать/выключать.

### 1.2 Текущее состояние

#### Внешние зависимости (КРИТИЧЕСКИЕ):
| Компонент | Использование | Статус |
|-----------|--------------|--------|
| **Elasticsearch** | Поиск товаров, компаний, контактов, заявок | Обязательный |
| **Bitrix24 API** | Fallback поиск, создание сделок, синхронизация | Обязательный |
| **Redis** | Кэширование API запросов | Опциональный |
| **PostgreSQL** | Основное хранилище данных | Обязательный |

#### Что УЖЕ есть в локальной БД:
- ✅ Users, Forms, FormFields
- ✅ Submissions (с bitrixDealId)
- ✅ **Nomenclature** (товары/номенклатура) - ГОТОВО
- ✅ NomenclatureCategory, NomenclatureUnit

#### Что ОТСУТСТВУЕТ в локальной БД:
- ❌ **Companies** (контрагенты-компании)
- ❌ **Contacts** (контрагенты-контакты)
- ❌ Локальный поиск для компаний/контактов

### 1.3 Целевое состояние

```
┌─────────────────────────────────────────────────────────────┐
│                     BETON CRM (Core)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                PostgreSQL Database                   │   │
│  │  • Users, Forms, Submissions                         │   │
│  │  • Nomenclature (товары)                            │   │
│  │  • Companies (контрагенты)     ← НОВОЕ              │   │
│  │  • Contacts (контакты)         ← НОВОЕ              │   │
│  │  • Full-text search (tsvector)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│              ┌────────────┴────────────┐                   │
│              ▼                         ▼                    │
│  ┌─────────────────────┐   ┌─────────────────────┐        │
│  │  Integration Module │   │  Integration Module │        │
│  │     BITRIX24        │   │   ELASTICSEARCH     │        │
│  │   (опциональный)    │   │   (опциональный)    │        │
│  │                     │   │                     │        │
│  │  • Sync deals       │   │  • Advanced search  │        │
│  │  • Sync companies   │   │  • Fuzzy matching   │        │
│  │  • Sync contacts    │   │  • Suggestions      │        │
│  └─────────────────────┘   └─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Детальный план реализации

### Фаза 1: Контрагенты (Companies & Contacts)
**Приоритет**: ВЫСОКИЙ
**Оценка**: 2-3 дня

#### Task 1.1: Создание Entity для Companies
**Файл**: `server/src/database/entities/Company.entity.ts`

```typescript
// Поля:
- id (UUID, PK)
- name (string) - название компании
- shortName (string, nullable) - краткое название
- inn (string, nullable, indexed) - ИНН
- kpp (string, nullable) - КПП
- ogrn (string, nullable) - ОГРН
- legalAddress (string, nullable) - юридический адрес
- actualAddress (string, nullable) - фактический адрес
- phone (string, nullable) - телефон
- email (string, nullable) - email
- website (string, nullable) - сайт
- industry (string, nullable) - отрасль
- companyType (enum: 'customer', 'supplier', 'partner', 'other')
- notes (text, nullable) - примечания
- attributes (jsonb) - дополнительные атрибуты
- tags (string[]) - теги
- isActive (boolean, default true)
// Bitrix24 маппинг:
- bitrixCompanyId (string, nullable, indexed) - ID в Bitrix24
- syncStatus (enum: 'local_only', 'synced', 'pending', 'error')
- lastSyncAt (timestamp, nullable)
- syncError (text, nullable)
// Full-text search:
- searchVector (tsvector, auto-generated)
// Аудит:
- createdAt, updatedAt, createdBy, updatedBy
```

#### Task 1.2: Создание Entity для Contacts
**Файл**: `server/src/database/entities/Contact.entity.ts`

```typescript
// Поля:
- id (UUID, PK)
- firstName (string) - имя
- lastName (string, nullable) - фамилия
- middleName (string, nullable) - отчество
- position (string, nullable) - должность
- phone (string, nullable) - телефон
- email (string, nullable) - email
- companyId (UUID, FK → companies, nullable) - связь с компанией
- notes (text, nullable) - примечания
- attributes (jsonb) - дополнительные атрибуты
- tags (string[]) - теги
- isActive (boolean, default true)
// Bitrix24 маппинг:
- bitrixContactId (string, nullable, indexed)
- syncStatus (enum)
- lastSyncAt, syncError
// Full-text search:
- searchVector (tsvector)
// Аудит:
- createdAt, updatedAt, createdBy, updatedBy
```

#### Task 1.3: Создание миграции
**Файл**: `server/src/database/migrations/1758100000000-CreateCompaniesAndContacts.ts`

- CREATE TABLE companies
- CREATE TABLE contacts
- CREATE INDEX для searchVector (GIN)
- CREATE INDEX для bitrixCompanyId, bitrixContactId, inn
- CREATE TRIGGER для автообновления searchVector

#### Task 1.4: Репозитории
**Файлы**:
- `server/src/database/repositories/CompanyRepository.ts`
- `server/src/database/repositories/ContactRepository.ts`

Методы:
- `findAll(filters, pagination)`
- `findById(id)`
- `findByBitrixId(bitrixId)`
- `findByInn(inn)`
- `search(query, limit)` - fulltext search
- `fullTextSearch(query, limit)` - с tsvector
- `create(data)`, `update(id, data)`, `delete(id)`

#### Task 1.5: Сервисы
**Файлы**:
- `server/src/services/CompanyService.ts`
- `server/src/services/ContactService.ts`

#### Task 1.6: Контроллеры и Routes
**Файлы**:
- `server/src/controllers/companyController.ts`
- `server/src/controllers/contactController.ts`
- `server/src/routes/companyRoutes.ts`
- `server/src/routes/contactRoutes.ts`

API Endpoints:
```
GET    /api/companies              - список компаний
GET    /api/companies/:id          - компания по ID
GET    /api/companies/search       - поиск компаний
POST   /api/companies              - создать компанию
PUT    /api/companies/:id          - обновить компанию
DELETE /api/companies/:id          - удалить компанию

GET    /api/contacts               - список контактов
GET    /api/contacts/:id           - контакт по ID
GET    /api/contacts/search        - поиск контактов
POST   /api/contacts               - создать контакт
PUT    /api/contacts/:id           - обновить контакт
DELETE /api/contacts/:id           - удалить контакт
```

---

### Фаза 2: Переключение форм на локальную БД
**Приоритет**: ВЫСОКИЙ
**Оценка**: 1-2 дня

#### Task 2.1: Frontend - CompanyService
**Файл**: `client/src/services/companyService.ts`

```typescript
export const CompanyService = {
  search: (query: string, limit = 20) =>
    api.get('/api/companies/search', { params: { query, limit } }),
  getById: (id: string) =>
    api.get(`/api/companies/${id}`),
  getAll: (params) =>
    api.get('/api/companies', { params }),
  create: (data) =>
    api.post('/api/companies', data),
  update: (id, data) =>
    api.put(`/api/companies/${id}`, data),
  delete: (id) =>
    api.delete(`/api/companies/${id}`)
}
```

#### Task 2.2: Frontend - ContactService
**Файл**: `client/src/services/contactService.ts`

Аналогично CompanyService.

#### Task 2.3: Обновление useDynamicOptions.ts
**Файл**: `client/src/components/form/FormField/hooks/useDynamicOptions.ts`

Изменить логику для `case 'companies'` и `case 'contacts'`:

```typescript
case 'companies':
  // ПЕРВЫЙ ПРИОРИТЕТ: локальная БД
  try {
    const localResponse = await CompanyService.search(trimmedQuery, 50)
    if (localResponse?.result && localResponse.result.length > 0) {
      dataOptions = localResponse.result.map(...)
      break
    }
  } catch (localError) {
    console.log('Локальная БД недоступна, используем fallback')
  }
  // FALLBACK: Elasticsearch/Bitrix24 (если включена интеграция)
  response = await FormFieldService.getCompanies(trimmedQuery)
  // ...
```

#### Task 2.4: Удаление прямых зависимостей от Elasticsearch в формах
Убрать обращения к `/api/search/companies` и `/api/search/contacts` из основного потока.

---

### Фаза 3: Модуляризация интеграций
**Приоритет**: СРЕДНИЙ
**Оценка**: 2-3 дня

#### Task 3.1: Создание базового класса интеграций
**Файл**: `server/src/integrations/base/IntegrationModule.ts`

```typescript
export abstract class IntegrationModule {
  abstract readonly name: string
  abstract readonly version: string

  abstract isEnabled(): boolean
  abstract initialize(): Promise<void>
  abstract healthCheck(): Promise<boolean>
  abstract shutdown(): Promise<void>
}
```

#### Task 3.2: Bitrix24 Integration Module
**Файл**: `server/src/integrations/bitrix24/Bitrix24Module.ts`

```typescript
export class Bitrix24Module extends IntegrationModule {
  name = 'bitrix24'
  version = '1.0.0'

  isEnabled(): boolean {
    return !!process.env.BITRIX24_WEBHOOK_URL
  }

  // Методы синхронизации:
  async syncCompanies(): Promise<SyncResult>
  async syncContacts(): Promise<SyncResult>
  async syncProducts(): Promise<SyncResult>
  async createDeal(data): Promise<DealResult>
  async updateDealStatus(dealId, status): Promise<void>
}
```

#### Task 3.3: Elasticsearch Integration Module
**Файл**: `server/src/integrations/elasticsearch/ElasticsearchModule.ts`

```typescript
export class ElasticsearchModule extends IntegrationModule {
  name = 'elasticsearch'
  version = '1.0.0'

  isEnabled(): boolean {
    return !!process.env.ELASTICSEARCH_HOST
  }

  // Методы:
  async advancedSearch(query, options): Promise<SearchResult[]>
  async suggest(query): Promise<string[]>
  async indexDocument(doc): Promise<void>
}
```

#### Task 3.4: Integration Manager
**Файл**: `server/src/integrations/IntegrationManager.ts`

```typescript
export class IntegrationManager {
  private modules: Map<string, IntegrationModule> = new Map()

  register(module: IntegrationModule): void
  get<T extends IntegrationModule>(name: string): T | null
  isEnabled(name: string): boolean
  async initializeAll(): Promise<void>
  async shutdownAll(): Promise<void>
}

export const integrationManager = new IntegrationManager()
```

#### Task 3.5: Настройки интеграций в БД
**Файл**: `server/src/database/entities/IntegrationSettings.entity.ts`

```typescript
// Поля:
- id (UUID)
- moduleName (string, unique) - 'bitrix24', 'elasticsearch'
- isEnabled (boolean)
- config (jsonb) - настройки модуля
- lastSyncAt (timestamp)
- syncStatus (string)
- createdAt, updatedAt
```

---

### Фаза 4: Синхронизация данных
**Приоритет**: СРЕДНИЙ
**Оценка**: 2-3 дня

#### Task 4.1: Импорт из Bitrix24
**Файл**: `server/src/integrations/bitrix24/importers/`

- `CompanyImporter.ts` - импорт компаний из Bitrix24
- `ContactImporter.ts` - импорт контактов из Bitrix24
- `ProductImporter.ts` - импорт товаров из Bitrix24

```typescript
export class CompanyImporter {
  async importAll(): Promise<ImportResult>
  async importById(bitrixId: string): Promise<Company>
  async importBatch(offset: number, limit: number): Promise<Company[]>
}
```

#### Task 4.2: Экспорт в Bitrix24
**Файл**: `server/src/integrations/bitrix24/exporters/`

- `CompanyExporter.ts` - создание/обновление компаний в Bitrix24
- `ContactExporter.ts` - создание/обновление контактов в Bitrix24
- `DealExporter.ts` - создание сделок в Bitrix24

#### Task 4.3: Двусторонняя синхронизация
**Файл**: `server/src/integrations/bitrix24/SyncService.ts`

```typescript
export class Bitrix24SyncService {
  // Синхронизация по расписанию
  async scheduledSync(): Promise<void>

  // Инкрементальная синхронизация (только измененные)
  async incrementalSync(entityType: string, since: Date): Promise<void>

  // Обработка конфликтов
  async resolveConflict(local: Entity, remote: any): Promise<Entity>
}
```

#### Task 4.4: Webhooks от Bitrix24
**Файл**: `server/src/routes/webhookRoutes.ts`

```
POST /api/webhooks/bitrix24/company    - обновление компании
POST /api/webhooks/bitrix24/contact    - обновление контакта
POST /api/webhooks/bitrix24/deal       - обновление сделки
```

---

### Фаза 5: Admin Panel для управления
**Приоритет**: НИЗКИЙ
**Оценка**: 2-3 дня

#### Task 5.1: UI компонент управления компаниями
**Файл**: `client/src/components/admin/Companies/`

- `CompanyList.tsx` - список компаний с поиском и фильтрами
- `CompanyForm.tsx` - форма создания/редактирования
- `CompanyDetails.tsx` - детальная карточка компании
- `CompanyImportModal.tsx` - импорт из Excel/Bitrix24

#### Task 5.2: UI компонент управления контактами
**Файл**: `client/src/components/admin/Contacts/`

Аналогично Companies.

#### Task 5.3: UI управления интеграциями
**Файл**: `client/src/components/admin/Integrations/`

- `IntegrationList.tsx` - список доступных интеграций
- `Bitrix24Settings.tsx` - настройки Bitrix24
- `ElasticsearchSettings.tsx` - настройки Elasticsearch
- `SyncStatus.tsx` - статус синхронизации

---

## 3. API Changes Summary

### Новые endpoints:

```
# Компании
GET    /api/companies
GET    /api/companies/:id
GET    /api/companies/search?query=...&limit=20
POST   /api/companies
PUT    /api/companies/:id
DELETE /api/companies/:id
POST   /api/companies/import/excel
POST   /api/companies/import/bitrix24

# Контакты
GET    /api/contacts
GET    /api/contacts/:id
GET    /api/contacts/search?query=...&limit=20
POST   /api/contacts
PUT    /api/contacts/:id
DELETE /api/contacts/:id
POST   /api/contacts/import/excel
POST   /api/contacts/import/bitrix24

# Интеграции
GET    /api/integrations
GET    /api/integrations/:name
PUT    /api/integrations/:name/toggle
POST   /api/integrations/:name/sync
GET    /api/integrations/:name/status

# Webhooks
POST   /api/webhooks/bitrix24/company
POST   /api/webhooks/bitrix24/contact
POST   /api/webhooks/bitrix24/deal
```

### Модификации существующих endpoints:

```
# Поиск - теперь использует локальную БД как primary
GET /api/nomenclature/search  - УЖЕ РАБОТАЕТ (PostgreSQL)
GET /api/companies/search     - НОВЫЙ (PostgreSQL)
GET /api/contacts/search      - НОВЫЙ (PostgreSQL)

# Elasticsearch endpoints - остаются как опциональные
POST /api/search/products     - fallback если включен ES
POST /api/search/companies    - fallback если включен ES
POST /api/search/contacts     - fallback если включен ES
```

---

## 4. Database Schema Changes

### Новые таблицы:

```sql
-- Компании
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(500) NOT NULL,
  short_name VARCHAR(255),
  inn VARCHAR(20),
  kpp VARCHAR(15),
  ogrn VARCHAR(20),
  legal_address TEXT,
  actual_address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  industry VARCHAR(255),
  company_type VARCHAR(50) DEFAULT 'customer',
  notes TEXT,
  attributes JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  -- Bitrix24 mapping
  bitrix_company_id VARCHAR(50),
  sync_status VARCHAR(50) DEFAULT 'local_only',
  last_sync_at TIMESTAMP,
  sync_error TEXT,
  -- Full-text search
  search_vector TSVECTOR,
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX idx_companies_search ON companies USING GIN(search_vector);
CREATE INDEX idx_companies_bitrix_id ON companies(bitrix_company_id);
CREATE INDEX idx_companies_inn ON companies(inn);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- Контакты
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  middle_name VARCHAR(255),
  position VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  notes TEXT,
  attributes JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  -- Bitrix24 mapping
  bitrix_contact_id VARCHAR(50),
  sync_status VARCHAR(50) DEFAULT 'local_only',
  last_sync_at TIMESTAMP,
  sync_error TEXT,
  -- Full-text search
  search_vector TSVECTOR,
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX idx_contacts_search ON contacts USING GIN(search_vector);
CREATE INDEX idx_contacts_bitrix_id ON contacts(bitrix_contact_id);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_is_active ON contacts(is_active);

-- Настройки интеграций
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name VARCHAR(50) UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. Configuration Changes

### Переменные окружения:

```env
# Core (обязательные)
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=beton_user
DB_PASSWORD=your_password
DB_NAME=beton_crm
JWT_SECRET=your_jwt_secret

# Bitrix24 Integration (опционально)
BITRIX24_ENABLED=true
BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.ru/rest/user_id/webhook_key/
BITRIX24_SYNC_INTERVAL=3600  # секунды

# Elasticsearch Integration (опционально)
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200

# Redis Cache (опционально)
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379
```

### docker-compose изменения:

```yaml
# Elasticsearch и Redis становятся опциональными
elasticsearch:
  profiles: ["full", "elasticsearch"]
  # ...

redis:
  profiles: ["full", "redis"]
  # ...
```

---

## 6. Migration Strategy

### Шаг 1: Подготовка (без простоя)
1. Создать новые таблицы (companies, contacts)
2. Создать новые API endpoints
3. Импортировать данные из Bitrix24/Elasticsearch в новые таблицы

### Шаг 2: Переключение (минимальный простой)
1. Обновить frontend для использования новых API
2. Переключить формы на локальную БД
3. Elasticsearch/Bitrix24 переводятся в режим fallback

### Шаг 3: Очистка
1. Удалить устаревшие зависимости
2. Оптимизировать индексы БД
3. Документировать новую архитектуру

---

## 7. Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Потеря данных при миграции | Низкая | Высокое | Backup перед миграцией, тестирование на staging |
| Снижение производительности поиска | Средняя | Среднее | PostgreSQL tsvector + GIN индексы, оптимизация запросов |
| Несовместимость с текущими формами | Средняя | Высокое | Обратная совместимость API, feature flags |
| Сложность синхронизации | Средняя | Среднее | Инкрементальная синхронизация, логирование конфликтов |

---

## 8. Success Metrics

- [ ] Приложение работает без Elasticsearch (можно отключить)
- [ ] Приложение работает без Bitrix24 (можно отключить)
- [ ] Поиск компаний/контактов работает из локальной БД
- [ ] Время отклика поиска < 200ms для 95% запросов
- [ ] Синхронизация с Bitrix24 работает как опциональный модуль
- [ ] Admin panel для управления компаниями и контактами

---

## 9. Timeline

| Фаза | Описание | Оценка | Приоритет |
|------|----------|--------|-----------|
| Фаза 1 | Контрагенты (Companies & Contacts) | 2-3 дня | ВЫСОКИЙ |
| Фаза 2 | Переключение форм на локальную БД | 1-2 дня | ВЫСОКИЙ |
| Фаза 3 | Модуляризация интеграций | 2-3 дня | СРЕДНИЙ |
| Фаза 4 | Синхронизация данных | 2-3 дня | СРЕДНИЙ |
| Фаза 5 | Admin Panel | 2-3 дня | НИЗКИЙ |

**Общая оценка**: 9-14 дней

---

## 10. Appendix: Current Data Flow

### Текущий поток (forms → search):

```
Frontend Form
     │
     ▼
useDynamicOptions.ts
     │
     ├─── catalog ────► NomenclatureService.search() ─► PostgreSQL (✅ ГОТОВО)
     │                         │
     │                         └─► fallback: FormFieldService.getProducts() ─► Elasticsearch ─► Bitrix24
     │
     ├─── companies ──► FormFieldService.getCompanies() ─► Elasticsearch ─► Bitrix24 (❌ ЗАВИСИМОСТЬ)
     │
     └─── contacts ───► FormFieldService.getContacts() ─► Elasticsearch ─► Bitrix24 (❌ ЗАВИСИМОСТЬ)
```

### Целевой поток (после изоляции):

```
Frontend Form
     │
     ▼
useDynamicOptions.ts
     │
     ├─── catalog ────► NomenclatureService.search() ─► PostgreSQL (✅)
     │
     ├─── companies ──► CompanyService.search() ─► PostgreSQL (✅ НОВОЕ)
     │                         │
     │                         └─► [опционально] Elasticsearch fallback
     │
     └─── contacts ───► ContactService.search() ─► PostgreSQL (✅ НОВОЕ)
                               │
                               └─► [опционально] Elasticsearch fallback
```
