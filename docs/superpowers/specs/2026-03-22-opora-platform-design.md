# ОПОРА — Облачная Платформа Организации Рабочих Активностей

## Спецификация продукта

**Дата:** 2026-03-22
**Статус:** Утверждено
**База:** Beton CRM (эволюционный подход)

---

## 1. Видение продукта

**ОПОРА** — универсальная мультитенантная SaaS-платформа для бизнеса с полевыми сотрудниками. Торговые представители, медпреды, сервисные инженеры — все, кто работает "в поле" и кому нужно фиксировать визиты и оформлять заказы.

**Расшифровка:** Облачная Платформа Организации Рабочих Активностей

**Портрет клиента:** Производитель или дистрибьютор, чьи сотрудники работают в поле — посещают клиентов, оформляют заказы, фиксируют визиты. Направления: фарма, FMCG, стройматериалы, оборудование, сервис.

**Происхождение:** Объединение двух существующих приложений:
- **Beton CRM** (React + Express + TypeScript + PostgreSQL) — заказы, формы, номенклатура, мультитенантность
- **West Visit** (React + FastAPI/Python + PostgreSQL) — визиты, клиники, врачи, PWA

---

## 2. Ключевой архитектурный принцип

### "Всё в приложении, интеграции — надстройка"

Платформа ОПОРА **полностью самодостаточна**. Все данные создаются, хранятся и управляются внутри собственной БД. Внешние интеграции (Bitrix24, 1С, AmoCRM) — это опциональные модули-надстройки, которые обогащают данные двусторонней синхронизацией, но без них система полностью функциональна.

**Ядро (всегда работает автономно):**
- Компании — создаются и хранятся в БД ОПОРА
- Контакты — создаются и хранятся в БД ОПОРА
- Визиты — создаются и хранятся в БД ОПОРА
- Заявки — создаются и хранятся в БД ОПОРА
- Номенклатура — создаётся и хранится в БД ОПОРА
- Формы — создаются и хранятся в БД ОПОРА

**Модуль интеграций (опционально):**
- Bitrix24 — двусторонний мост, синхронизация компаний, контактов, визитов, заявок
- В будущем: 1С, AmoCRM, Мой Склад
- Каждая интеграция — мост, а не зависимость

**Сценарий:**
1. Организация регистрируется → работает полностью на своей БД
2. Когда хочет — подключает Bitrix24 → данные начинают синхронизироваться
3. Отключает Bitrix24 → всё продолжает работать, синхронизация останавливается

Это отличается от текущей архитектуры Beton CRM, где некоторые данные (компании, контакты) тянутся из Bitrix24. В ОПОРА — всё своё, интеграции только синхронизируют.

---

## 3. Монетизация

**Модель:** Freemium

| | Free | Pro |
|---|---|---|
| Пользователи | до 2 | безлимит |
| Заявки/месяц | до 100 | безлимит |
| Визиты/месяц | до 100 | безлимит |
| Модули | все | все |
| Bitrix24 | да | да |
| PWA/Оффлайн | да | да |
| Кастомный брендинг | нет | да |
| Приоритетная поддержка | нет | да |

### Защита от абуза Free-плана

Проблема: компания может создать множество бесплатных организаций по 2 юзера вместо оплаты Pro.

Многоуровневая защита:

- **Email-домен:** Все пользователи организации должны иметь email на одном домене (@company.ru). Нельзя создать вторую организацию с тем же доменом. Исключение: публичные домены (gmail.com, mail.ru, yandex.ru) — для них эта проверка не применяется.
- **Телефон суперадмина:** Один номер телефона = одна организация. Верификация по SMS при регистрации.
- **Флаг подозрительности:** Автоматическая проверка паттернов — совпадение IP при регистрации, похожие названия организаций, один и тот же создатель. Подозрительные аккаунты помечаются для ручной проверки.

---

## 4. Модульная архитектура

```
ОПОРА Platform
├── Ядро (всегда включено)
│   ├── Мультитенантность (Organization, Users, Roles)
│   ├── Аутентификация (JWT, RBAC)
│   ├── Компании / Контакты (общий справочник)
│   └── Настройки организации
│
├── Модуль "Заказы" (опционально)
│   ├── Динамические формы
│   ├── Заявки / Submissions
│   └── Номенклатура + категории
│
├── Модуль "Визиты" (опционально, портируется из West Visit)
│   ├── Визиты (план, факт, статусы)
│   ├── Календарь визитов
│   └── Маршруты
│
├── Модуль "Интеграции" (опционально)
│   ├── Bitrix24 (двусторонняя синхронизация)
│   ├── Маппинг полей per организация
│   └── Будущие: 1С, AmoCRM и т.д.
│
└── Модуль "PWA/Оффлайн" (опционально)
    ├── Service Worker
    ├── Локальный кэш (IndexedDB)
    └── Синхронизация при восстановлении связи
```

### Конфигурация модулей в Organization

**Важно:** В Organization.entity.ts уже существуют колонки `subscriptionPlan` и `subscriptionExpiresAt` на уровне сущности. Поле `plan` НЕ дублируется внутри `settings` JSONB — используется существующая колонка `subscriptionPlan`. Новые поля `modules` и `limits` добавляются в `settings` JSONB.

```typescript
// Organization.entity.ts — существующие колонки (НЕ трогаем)
@Column({ nullable: true })
subscriptionPlan: string; // 'free' | 'pro' — используем как есть

@Column({ nullable: true })
subscriptionExpiresAt: Date;

// Organization.settings JSONB — расширяем
interface OrganizationSettings {
  // Существующие поля
  bitrixEnabled: boolean;
  bitrixFieldMapping: Record<string, string>;
  bitrixStatuses: Record<string, string>;
  materialConfig: Record<string, any>;
  specialFields: Record<string, any>;
  branding: BrandingConfig;

  // Новые поля
  modules: {
    orders: boolean;        // модуль заказов
    visits: boolean;        // модуль визитов
    integrations: boolean;  // интеграции
    pwa: boolean;           // оффлайн-режим
  };
  limits: {
    maxUsers: number;              // free: 2, pro: unlimited (-1)
    maxSubmissionsPerMonth: number; // free: 100, pro: unlimited (-1)
    maxVisitsPerMonth: number;      // free: 100, pro: unlimited (-1)
  };
}

interface BrandingConfig {
  logoUrl: string;
  primaryColor: string;
  companyName: string;
  faviconUrl: string;   // новое поле, добавить в миграции
}
```

### Middleware-цепочка

```
Request → tenantMiddleware → moduleGuard(module) → planLimitsGuard → controller
```

- `tenantMiddleware` — определяет организацию из JWT
- `moduleGuard(module)` — проверяет что модуль включен, иначе 403
- `planLimitsGuard` — проверяет лимиты плана, иначе 429

---

## 5. Модуль "Визиты" — детальный дизайн

### Новая сущность Visit (TypeORM)

Портируется из Python SQLAlchemy (West Visit) в TypeScript TypeORM.

```typescript
// Visit.entity.ts
@Entity('visits')
class Visit extends AuditableEntity {
  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Company)
  company: Company;

  @Column('uuid')
  companyId: string;

  @ManyToOne(() => Contact, { nullable: true })
  contact: Contact;

  @Column('uuid', { nullable: true })
  contactId: string;

  @ManyToOne(() => User)
  user: User;

  @Column('uuid')
  userId: string;

  @Column('timestamp')
  date: Date;

  @Column({ type: 'enum', enum: ['planned', 'completed', 'cancelled', 'failed'] })
  status: VisitStatus;

  @Column({ nullable: true })
  visitType: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'jsonb', default: {} })
  dynamicFields: Record<string, any>;

  @Column({ nullable: true })
  bitrixId: string;

  @Column({ type: 'enum', enum: ['synced', 'pending', 'error', 'none'], default: 'none' })
  syncStatus: SyncStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastSynced: Date;
}
```

### Переиспользование существующих сущностей

| West Visit | ОПОРА (уже есть) | Примечание |
|------------|-------------------|------------|
| Company (клиника) | **Company** | Та же сущность, уже имеет `organizationId` |
| Doctor (врач) | **Contact** | Контакт с типом/ролью per организация |
| User | **User** | Уже с мультитенантностью через UserOrganization |
| FieldMapping | **Organization.settings** | Маппинг полей в настройках организации |

Портируется **только Visit** как новая сущность. Остальное переиспользуется.

**Важно: Contact и tenant isolation.** Сущность Contact сейчас НЕ имеет прямого `organizationId` — она привязана к организации косвенно через `companyId → Company.organizationId`. При реализации модуля визитов необходимо:
- Либо добавить `organizationId` напрямую в Contact (миграция, предпочтительный вариант)
- Либо в VisitService/VisitRepository всегда выполнять JOIN через Company для валидации tenant-принадлежности контакта

Рекомендуется первый вариант — добавить `organizationId` в Contact для прямой tenant-фильтрации.

### Бэкенд-структура

```
server/src/
├── database/entities/
│   └── Visit.entity.ts              // новая сущность
├── database/repositories/
│   └── VisitRepository.ts           // tenant-aware
├── services/
│   └── VisitService.ts              // бизнес-логика визитов
├── controllers/
│   └── visitController.ts           // CRUD + статусы
├── routes/
│   └── visitRoutes.ts               // маршруты API
└── middleware/
    └── moduleGuard.ts               // проверка доступа к модулю (новый)
```

### API эндпоинты

**Важно:** В Express маршруты матчатся по порядку регистрации. Статические пути (`/calendar`, `/sync`) регистрируются ДО параметрических (`/:id`), иначе Express интерпретирует "calendar" как id.

```
GET    /api/visits                 // список (фильтры: дата, статус, компания, пользователь)
POST   /api/visits                 // создание
GET    /api/visits/calendar        // визиты по диапазону дат (для календаря) — ДО /:id!
POST   /api/visits/sync            // синхронизация с Bitrix24 — ДО /:id!
GET    /api/visits/:id             // детали
PUT    /api/visits/:id             // обновление
PATCH  /api/visits/:id/status      // смена статуса
DELETE /api/visits/:id             // удаление
```

### Фронтенд-структура

```
client/src/
├── pages/
│   └── visits/
│       ├── VisitsPage.tsx            // список с фильтрами
│       ├── VisitCreatePage.tsx       // создание
│       ├── VisitDetailsPage.tsx      // карточка
│       └── VisitCalendarPage.tsx     // календарь
├── components/
│   └── visits/
│       ├── VisitCard.tsx             // карточка в списке
│       ├── VisitStatusBadge.tsx      // цветовой статус
│       └── VisitForm.tsx             // форма создания/редактирования
└── services/
    └── visitService.ts              // API-клиент
```

---

## 6. PWA / Оффлайн

### Архитектура

```
┌─────────────────────────────────┐
│           Фронтенд              │
│                                 │
│  React App ←→ LocalStore (IDB)  │
│       ↕              ↕          │
│  Service Worker   SyncQueue     │
│       ↕              ↕          │
└───────┼──────────────┼──────────┘
        ↕              ↕
   Cache API     Backend API
  (статика)      (когда онлайн)
```

### Компоненты

**Service Worker** — кэширует статику (JS, CSS, шрифты). Приложение открывается без сети.

**IndexedDB (Dexie.js)** — локальное хранилище:
- Визиты, заявки, справочники компаний/контактов
- Загружаются при старте, обновляются в фоне

**SyncQueue** — очередь оффлайн-действий:
```typescript
interface QueuedAction {
  id: string;
  type: 'create_visit' | 'update_visit' | 'create_submission' | ...;
  payload: any;
  createdAt: Date;
  retries: number;
}
```

Пользователь создаёт визит оффлайн → в очередь → при восстановлении сети отправляется на сервер.

**Индикатор статуса в Navbar:**
- Зелёный — онлайн, синхронизировано
- Жёлтый — онлайн, есть несинхронизированные данные
- Красный — оффлайн, N действий в очереди

**Конфликты — двухуровневая стратегия:**

- **Автоматические (не требуют вмешательства):** Если запись изменена только оффлайн-пользователем и никем другим на сервере — применяется автоматически (last-write-wins).
- **Ручные (требуют выбора):** Если запись изменена и оффлайн, и кем-то другим на сервере (true conflict) — показываем обе версии, пользователь выбирает какую оставить.

---

## 7. Freemium — реализация

### Бэкенд

**Middleware `planLimitsGuard`:**
```
POST /api/visits → tenantMiddleware → moduleGuard → planLimitsGuard → controller
```

1. Получить `organization.settings.plan` и `limits`
2. Проверить счётчик в Redis: `opora:limits:{orgId}:visits:2026-03`
3. Если лимит превышен → 429 "Лимит бесплатного плана исчерпан"

**Redis-счётчики:**
```
opora:limits:{orgId}:submissions:YYYY-MM = число
opora:limits:{orgId}:visits:YYYY-MM = число
```

Инкрементируются при создании. Сброс: используются ключи с `YYYY-MM` в имени, поэтому каждый месяц автоматически начинается новый ключ. Старые ключи удаляются cron-задачей (добавить в существующий `syncScheduler.ts`) 1-го числа каждого месяца — чистка ключей за позапрошлый месяц.

### Фронтенд

- Прогресс-бар "42 / 100 заявок" в шапке для free-плана
- Жёлтое предупреждение при 80% лимита
- Блокировка создания + CTA "Перейти на Pro" при достижении лимита
- Страница `/settings/billing` — управление тарифом

---

## 8. Ребрендинг Beton CRM → ОПОРА

### Тексты UI
- "Beton CRM" / "CRM Platform" → "ОПОРА"
- "Заказ бетона" → "Новая заявка"
- "© БетонЭкспресс" → "© ОПОРА"

### Meta и PWA
- `<title>` → "ОПОРА — Облачная Платформа Организации Рабочих Активностей"
- `manifest.json` → name: "ОПОРА", short_name: "ОПОРА"
- Новый favicon и логотипы

### Конфиги
- package.json: `beton-crm` → `opora-platform`
- Docker-образы: `beton-crm-backend` → `opora-backend`
- БД: `beton_crm` → `opora` (при чистом старте)
- Redis prefix: `opora:`

### Кастомный брендинг (Pro)
Free — брендинг ОПОРА. Pro — организация загружает свой логотип, цвета, название.

---

## 9. Дорожная карта

```
Этап 1: Мультитенантный фундамент              ✅ ГОТОВО
Этап 2: organizationId во все сервисы           ✅ ГОТОВО
Этап 3: Bitrix24 как опция                      ✅ ГОТОВО

Этап 4: Убрать хардкод номенклатуры             🔄 В ПРОЦЕССЕ
  4.1 Миграция без seed-данных бетона           ✅
  4.2 material_fields_config и field_* ID       🔄
  4.3 Elasticsearch синонимы                    ❌ (⚠ ES не в Docker Compose — решить: добавить в стек или убрать зависимость)

Этап 5: Ребрендинг → ОПОРА                      🔄 В ПРОЦЕССЕ
  5.1 Тексты UI → ОПОРА
  5.2 Meta, PWA, manifest
  5.3 Логотип, цвета, тема
  5.4 package.json, Docker, конфиги
  5.5 Кастомный брендинг per организация (Pro)

Этап 6: Модуль "Визиты"                         ❌ TODO
  6.1 Visit entity + миграция
  6.2 VisitRepository (tenant-aware)
  6.3 VisitService + VisitController + маршруты
  6.4 moduleGuard middleware
  6.5 Фронтенд: список, создание, карточка, календарь
  6.6 Синхронизация визитов с Bitrix24

Этап 7: PWA / Оффлайн                           ❌ TODO
  7.1 Service Worker + кэширование статики
  7.2 IndexedDB — локальное хранилище
  7.3 SyncQueue — очередь оффлайн-действий
  7.4 Индикатор статуса в Navbar
  7.5 Разрешение конфликтов

Этап 8: Freemium                                 ❌ TODO
  8.1 planLimitsGuard middleware
  8.2 Redis-счётчики лимитов
  8.3 Cron-задача очистки старых ключей (в syncScheduler.ts)
  8.4 Фронтенд: прогресс-бар, CTA "Pro"
  8.5 Страница биллинга

Этап 9: Онбординг                                ❌ TODO
  9.1 Мастер первоначальной настройки
  9.2 Выбор модулей при регистрации
  9.3 Шаблоны для отраслей
  9.4 Лендинг / страница регистрации
```

---

## 10. Технический стек

- **Frontend:** React + TypeScript + Material-UI + React Query
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL (TypeORM)
- **Cache:** Redis
- **PWA:** Service Worker + IndexedDB (Dexie.js)
- **Auth:** JWT + RBAC (superadmin → org_admin → manager → distributor)
- **Containerization:** Docker + Docker Compose
- **Integrations:** Bitrix24 (опционально), будущие: 1С, AmoCRM
