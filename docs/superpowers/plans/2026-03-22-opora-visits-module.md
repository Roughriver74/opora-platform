# ОПОРА: Модуль "Визиты" (Этап 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить модуль визитов — полевые сотрудники фиксируют посещения клиентов (компаний/контактов) с планированием, статусами и календарём.

**Architecture:** Новая сущность Visit с tenant-aware репозиторием, сервисом, контроллером, маршрутами и фронтенд-страницами. Следует существующим паттернам: BaseEntity → BaseRepository → BaseService → функциональные контроллеры → Express Router.

**Tech Stack:** TypeORM, Express, React, Material-UI, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-22-opora-platform-design.md` (секция 5)

---

## Файловая карта

### Новые файлы (бэкенд)

- `server/src/database/entities/Visit.entity.ts` — сущность визита
- `server/src/database/migrations/TIMESTAMP-CreateVisitsTable.ts` — миграция
- `server/src/database/repositories/VisitRepository.ts` — tenant-aware репозиторий
- `server/src/services/VisitService.ts` — бизнес-логика
- `server/src/controllers/visitController.ts` — обработчики запросов
- `server/src/routes/visitRoutes.ts` — маршруты API
- `server/src/middleware/moduleGuard.ts` — проверка доступа к модулю

### Изменяемые файлы (бэкенд)

- `server/src/database/entities/index.ts` — экспорт Visit
- `server/src/app.ts` — регистрация visitRoutes

### Новые файлы (фронтенд)

- `client/src/types/visit.ts` — TypeScript типы
- `client/src/services/visitService.ts` — API-клиент
- `client/src/pages/visits/VisitsPage.tsx` — список визитов
- `client/src/pages/visits/VisitCreatePage.tsx` — создание визита
- `client/src/pages/visits/VisitDetailsPage.tsx` — карточка визита
- `client/src/pages/visits/VisitCalendarPage.tsx` — календарь
- `client/src/components/visits/VisitCard.tsx` — карточка в списке
- `client/src/components/visits/VisitStatusBadge.tsx` — бейдж статуса
- `client/src/components/visits/VisitForm.tsx` — форма создания/редактирования

### Изменяемые файлы (фронтенд)

- `client/src/App.tsx` — добавить маршруты /visits/*
- `client/src/components/layout/Navbar.tsx` — пункт меню "Визиты"

---

## Task 1: Visit Entity + Миграция

**Files:**
- Create: `server/src/database/entities/Visit.entity.ts`
- Create: `server/src/database/migrations/1760000000000-CreateVisitsTable.ts`
- Modify: `server/src/database/entities/index.ts`

- [ ] **Step 1: Создать Visit.entity.ts**

Следуя паттерну Submission.entity.ts:

```typescript
import {
  Entity, Column, Index, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate
} from 'typeorm';
import { IsString, IsOptional, IsUUID, IsEnum, IsDate } from 'class-validator';
import { BaseEntity } from './base/BaseEntity';
import { User } from './User.entity';
import { Company } from './Company.entity';
import { Organization } from './Organization.entity';

export enum VisitStatus {
  PLANNED = 'planned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum VisitSyncStatus {
  NONE = 'none',
  PENDING = 'pending',
  SYNCED = 'synced',
  ERROR = 'error'
}

@Entity('visits')
@Index(['organizationId'])
@Index(['userId'])
@Index(['companyId'])
@Index(['date'])
@Index(['status'])
export class Visit extends BaseEntity {
  @Column({ type: 'uuid', name: 'organization_id' })
  @IsUUID()
  organizationId!: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ type: 'uuid', name: 'company_id' })
  @IsUUID()
  companyId!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ type: 'uuid', name: 'contact_id', nullable: true })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @IsUUID()
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'timestamp' })
  @IsDate()
  date!: Date;

  @Column({ type: 'enum', enum: VisitStatus, default: VisitStatus.PLANNED })
  @IsEnum(VisitStatus)
  status!: VisitStatus;

  @Column({ nullable: true, name: 'visit_type' })
  @IsOptional()
  @IsString()
  visitType?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;

  @Column({ type: 'jsonb', name: 'dynamic_fields', default: {} })
  dynamicFields!: Record<string, any>;

  @Column({ nullable: true, name: 'bitrix_id' })
  @IsOptional()
  @IsString()
  bitrixId?: string;

  @Column({
    type: 'enum',
    enum: VisitSyncStatus,
    default: VisitSyncStatus.NONE,
    name: 'sync_status'
  })
  @IsEnum(VisitSyncStatus)
  syncStatus!: VisitSyncStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'last_synced' })
  @IsOptional()
  lastSynced?: Date;

  // Denormalized fields for performance
  @Column({ nullable: true, name: 'user_name' })
  userName?: string;

  @Column({ nullable: true, name: 'company_name' })
  companyName?: string;

  isCompleted(): boolean {
    return this.status === VisitStatus.COMPLETED;
  }

  isSyncedWithBitrix(): boolean {
    return this.syncStatus === VisitSyncStatus.SYNCED;
  }
}
```

- [ ] **Step 2: Создать миграцию**

```typescript
// 1760000000000-CreateVisitsTable.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateVisitsTable1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`CREATE TYPE "visit_status_enum" AS ENUM('planned', 'completed', 'cancelled', 'failed')`);
    await queryRunner.query(`CREATE TYPE "visit_sync_status_enum" AS ENUM('none', 'pending', 'synced', 'error')`);

    await queryRunner.createTable(new Table({
      name: 'visits',
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
        { name: 'organization_id', type: 'uuid', isNullable: false },
        { name: 'company_id', type: 'uuid', isNullable: false },
        { name: 'contact_id', type: 'uuid', isNullable: true },
        { name: 'user_id', type: 'uuid', isNullable: false },
        { name: 'date', type: 'timestamp', isNullable: false },
        { name: 'status', type: 'visit_status_enum', default: "'planned'" },
        { name: 'visit_type', type: 'varchar', isNullable: true },
        { name: 'comment', type: 'text', isNullable: true },
        { name: 'dynamic_fields', type: 'jsonb', default: "'{}'" },
        { name: 'bitrix_id', type: 'varchar', isNullable: true },
        { name: 'sync_status', type: 'visit_sync_status_enum', default: "'none'" },
        { name: 'last_synced', type: 'timestamp', isNullable: true },
        { name: 'user_name', type: 'varchar', isNullable: true },
        { name: 'company_name', type: 'varchar', isNullable: true },
        { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);

    // Indexes
    await queryRunner.createIndex('visits', new TableIndex({ columnNames: ['organization_id'] }));
    await queryRunner.createIndex('visits', new TableIndex({ columnNames: ['user_id'] }));
    await queryRunner.createIndex('visits', new TableIndex({ columnNames: ['company_id'] }));
    await queryRunner.createIndex('visits', new TableIndex({ columnNames: ['date'] }));
    await queryRunner.createIndex('visits', new TableIndex({ columnNames: ['status'] }));

    // Foreign keys
    await queryRunner.createForeignKey('visits', new TableForeignKey({
      columnNames: ['organization_id'], referencedTableName: 'organizations', referencedColumnNames: ['id'], onDelete: 'CASCADE'
    }));
    await queryRunner.createForeignKey('visits', new TableForeignKey({
      columnNames: ['company_id'], referencedTableName: 'companies', referencedColumnNames: ['id'], onDelete: 'CASCADE'
    }));
    await queryRunner.createForeignKey('visits', new TableForeignKey({
      columnNames: ['user_id'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'CASCADE'
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('visits');
    await queryRunner.query(`DROP TYPE "visit_status_enum"`);
    await queryRunner.query(`DROP TYPE "visit_sync_status_enum"`);
  }
}
```

- [ ] **Step 3: Зарегистрировать в entities/index.ts**

Добавить экспорт:
```typescript
export { Visit, VisitStatus, VisitSyncStatus } from './Visit.entity';
```

- [ ] **Step 4: Коммит**

```bash
git add server/src/database/entities/Visit.entity.ts \
  server/src/database/migrations/1760000000000-CreateVisitsTable.ts \
  server/src/database/entities/index.ts
git commit -m "feat(visits): add Visit entity and migration"
```

---

## Task 2: VisitRepository (tenant-aware)

**Files:**
- Create: `server/src/database/repositories/VisitRepository.ts`

- [ ] **Step 1: Создать VisitRepository**

Следуя паттерну CompanyRepository.ts:

```typescript
import { BaseRepository } from './base/BaseRepository';
import { Visit, VisitStatus } from '../entities/Visit.entity';

export interface VisitFilterOptions {
  organizationId?: string;
  userId?: string;
  companyId?: string;
  status?: VisitStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class VisitRepository extends BaseRepository<Visit> {
  constructor() {
    super(Visit, 'visits');
  }

  async findWithFilters(options: VisitFilterOptions) {
    const qb = this.createQueryBuilder('v')
      .leftJoinAndSelect('v.company', 'company')
      .leftJoinAndSelect('v.user', 'user');

    if (options.organizationId) {
      qb.andWhere('v.organization_id = :organizationId', { organizationId: options.organizationId });
    }
    if (options.userId) {
      qb.andWhere('v.user_id = :userId', { userId: options.userId });
    }
    if (options.companyId) {
      qb.andWhere('v.company_id = :companyId', { companyId: options.companyId });
    }
    if (options.status) {
      qb.andWhere('v.status = :status', { status: options.status });
    }
    if (options.dateFrom) {
      qb.andWhere('v.date >= :dateFrom', { dateFrom: options.dateFrom });
    }
    if (options.dateTo) {
      qb.andWhere('v.date <= :dateTo', { dateTo: options.dateTo });
    }
    if (options.search) {
      qb.andWhere('(v.company_name ILIKE :search OR v.user_name ILIKE :search OR v.comment ILIKE :search)', { search: `%${options.search}%` });
    }

    const sortBy = options.sortBy || 'date';
    const sortOrder = options.sortOrder || 'DESC';
    qb.orderBy(`v.${sortBy}`, sortOrder);

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findCalendar(organizationId: string, dateFrom: Date, dateTo: Date) {
    return this.createQueryBuilder('v')
      .leftJoinAndSelect('v.company', 'company')
      .where('v.organization_id = :organizationId', { organizationId })
      .andWhere('v.date >= :dateFrom', { dateFrom })
      .andWhere('v.date <= :dateTo', { dateTo })
      .orderBy('v.date', 'ASC')
      .getMany();
  }
}

let visitRepositoryInstance: VisitRepository | null = null;
export function getVisitRepository(): VisitRepository {
  if (!visitRepositoryInstance) {
    visitRepositoryInstance = new VisitRepository();
  }
  return visitRepositoryInstance;
}
```

- [ ] **Step 2: Коммит**

```bash
git add server/src/database/repositories/VisitRepository.ts
git commit -m "feat(visits): add VisitRepository with filters and calendar"
```

---

## Task 3: VisitService

**Files:**
- Create: `server/src/services/VisitService.ts`

- [ ] **Step 1: Создать VisitService**

Следуя паттерну SubmissionService.ts:

```typescript
import { BaseService } from './base/BaseService';
import { Visit, VisitStatus } from '../database/entities/Visit.entity';
import { VisitRepository, VisitFilterOptions, getVisitRepository } from '../database/repositories/VisitRepository';

export interface CreateVisitDTO {
  organizationId: string;
  companyId: string;
  contactId?: string;
  userId: string;
  date: Date;
  status?: VisitStatus;
  visitType?: string;
  comment?: string;
  dynamicFields?: Record<string, any>;
}

export interface UpdateVisitDTO {
  companyId?: string;
  contactId?: string;
  date?: Date;
  status?: VisitStatus;
  visitType?: string;
  comment?: string;
  dynamicFields?: Record<string, any>;
}

export class VisitService extends BaseService<Visit, VisitRepository> {
  constructor() {
    super(getVisitRepository());
  }

  async createVisit(data: CreateVisitDTO): Promise<Visit> {
    const visit = await this.repository.create({
      ...data,
      status: data.status || VisitStatus.PLANNED,
      dynamicFields: data.dynamicFields || {},
    });
    return visit;
  }

  async updateVisit(id: string, data: UpdateVisitDTO): Promise<Visit> {
    const visit = await this.repository.update(id, data);
    return visit;
  }

  async updateStatus(id: string, status: VisitStatus): Promise<Visit> {
    return this.repository.update(id, { status });
  }

  async findWithFilters(options: VisitFilterOptions) {
    return this.repository.findWithFilters(options);
  }

  async findCalendar(organizationId: string, dateFrom: Date, dateTo: Date) {
    return this.repository.findCalendar(organizationId, dateFrom, dateTo);
  }
}

let visitServiceInstance: VisitService | null = null;
export function getVisitService(): VisitService {
  if (!visitServiceInstance) {
    visitServiceInstance = new VisitService();
  }
  return visitServiceInstance;
}
```

- [ ] **Step 2: Коммит**

```bash
git add server/src/services/VisitService.ts
git commit -m "feat(visits): add VisitService with CRUD and calendar"
```

---

## Task 4: moduleGuard Middleware

**Files:**
- Create: `server/src/middleware/moduleGuard.ts`

- [ ] **Step 1: Создать moduleGuard**

```typescript
import { Request, Response, NextFunction } from 'express';
import { getOrganizationService } from '../services/OrganizationService';

export function moduleGuard(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Superadmins bypass module checks
    if (req.isSuperAdmin) {
      return next();
    }

    const orgId = req.organizationId;
    if (!orgId) {
      return res.status(403).json({ message: 'Организация не выбрана' });
    }

    try {
      const orgService = getOrganizationService();
      const org = await orgService.findById(orgId);

      if (!org) {
        return res.status(404).json({ message: 'Организация не найдена' });
      }

      const modules = org.settings?.modules;
      // If modules config doesn't exist, allow all (backward compatibility)
      if (modules && modules[moduleName] === false) {
        return res.status(403).json({
          message: `Модуль "${moduleName}" не активирован для вашей организации`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
```

- [ ] **Step 2: Коммит**

```bash
git add server/src/middleware/moduleGuard.ts
git commit -m "feat(visits): add moduleGuard middleware"
```

---

## Task 5: visitController + visitRoutes + app.ts регистрация

**Files:**
- Create: `server/src/controllers/visitController.ts`
- Create: `server/src/routes/visitRoutes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Создать visitController.ts**

Следуя паттерну submissionController.ts — функциональные обработчики:

```typescript
import { Request, Response } from 'express';
import { getVisitService } from '../services/VisitService';
import { VisitStatus } from '../database/entities/Visit.entity';

export const getVisits = async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId;
    const { page, limit, status, companyId, userId, dateFrom, dateTo, search, sortBy, sortOrder } = req.query;

    const result = await getVisitService().findWithFilters({
      organizationId: orgId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status: status as VisitStatus,
      companyId: companyId as string,
      userId: userId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC',
    });

    res.json({ success: true, data: result.data, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getVisitById = async (req: Request, res: Response) => {
  try {
    const visit = await getVisitService().findById(req.params.id);
    if (!visit) return res.status(404).json({ message: 'Визит не найден' });
    res.json({ success: true, data: visit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getVisitCalendar = async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId!;
    const { dateFrom, dateTo } = req.query;
    if (!dateFrom || !dateTo) return res.status(400).json({ message: 'dateFrom и dateTo обязательны' });

    const visits = await getVisitService().findCalendar(orgId, new Date(dateFrom as string), new Date(dateTo as string));
    res.json({ success: true, data: visits });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createVisit = async (req: Request, res: Response) => {
  try {
    const orgId = req.organizationId!;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Пользователь не авторизован' });

    const { companyId, contactId, date, visitType, comment, dynamicFields } = req.body;
    if (!companyId || !date) return res.status(400).json({ message: 'companyId и date обязательны' });

    const visit = await getVisitService().createVisit({
      organizationId: orgId,
      companyId,
      contactId,
      userId,
      date: new Date(date),
      visitType,
      comment,
      dynamicFields,
    });

    res.status(201).json({ success: true, data: visit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateVisit = async (req: Request, res: Response) => {
  try {
    const { companyId, contactId, date, visitType, comment, dynamicFields } = req.body;
    const visit = await getVisitService().updateVisit(req.params.id, {
      companyId, contactId,
      date: date ? new Date(date) : undefined,
      visitType, comment, dynamicFields,
    });
    res.json({ success: true, data: visit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateVisitStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!Object.values(VisitStatus).includes(status)) {
      return res.status(400).json({ message: 'Некорректный статус' });
    }
    const visit = await getVisitService().updateStatus(req.params.id, status);
    res.json({ success: true, data: visit });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteVisit = async (req: Request, res: Response) => {
  try {
    await getVisitService().delete(req.params.id);
    res.json({ success: true, message: 'Визит удалён' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
```

- [ ] **Step 2: Создать visitRoutes.ts**

Важно: `/calendar` и `/sync` ДО `/:id`!

```typescript
import express from 'express';
import { moduleGuard } from '../middleware/moduleGuard';
import { getVisits, getVisitById, getVisitCalendar, createVisit, updateVisit, updateVisitStatus, deleteVisit } from '../controllers/visitController';

const router = express.Router();

// Module guard — all visit routes require 'visits' module
router.use(moduleGuard('visits'));

// Static routes BEFORE parametric
router.get('/calendar', getVisitCalendar);

// CRUD
router.get('/', getVisits);
router.post('/', createVisit);
router.get('/:id', getVisitById);
router.put('/:id', updateVisit);
router.patch('/:id/status', updateVisitStatus);
router.delete('/:id', deleteVisit);

export default router;
```

- [ ] **Step 3: Зарегистрировать в app.ts**

Найти блок с protected routes (после `app.use(tenantMiddleware)`) и добавить:

```typescript
import visitRoutes from './routes/visitRoutes';
// ...
app.use('/api/visits', visitRoutes);
```

- [ ] **Step 4: Коммит**

```bash
git add server/src/controllers/visitController.ts \
  server/src/routes/visitRoutes.ts \
  server/src/app.ts
git commit -m "feat(visits): add controller, routes, register in app"
```

---

## Task 6: Фронтенд — типы и API-сервис

**Files:**
- Create: `client/src/types/visit.ts`
- Create: `client/src/services/visitService.ts`

- [ ] **Step 1: Создать visit types**

```typescript
// client/src/types/visit.ts
export type VisitStatus = 'planned' | 'completed' | 'cancelled' | 'failed';

export interface Visit {
  id: string;
  organizationId: string;
  companyId: string;
  contactId?: string;
  userId: string;
  date: string;
  status: VisitStatus;
  visitType?: string;
  comment?: string;
  dynamicFields: Record<string, any>;
  bitrixId?: string;
  syncStatus: string;
  userName?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string };
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export interface VisitFilters {
  page?: number;
  limit?: number;
  status?: VisitStatus;
  companyId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateVisitData {
  companyId: string;
  contactId?: string;
  date: string;
  visitType?: string;
  comment?: string;
  dynamicFields?: Record<string, any>;
}

export interface UpdateVisitData {
  companyId?: string;
  contactId?: string;
  date?: string;
  visitType?: string;
  comment?: string;
  dynamicFields?: Record<string, any>;
}
```

- [ ] **Step 2: Создать visitService.ts**

```typescript
// client/src/services/visitService.ts
import api from './api';
import { Visit, VisitFilters, CreateVisitData, UpdateVisitData, VisitStatus } from '../types/visit';

export const visitService = {
  getVisits: async (filters: VisitFilters = {}) => {
    const response = await api.get('/api/visits', { params: filters });
    return response.data;
  },

  getVisitById: async (id: string) => {
    const response = await api.get(`/api/visits/${id}`);
    return response.data;
  },

  getCalendar: async (dateFrom: string, dateTo: string) => {
    const response = await api.get('/api/visits/calendar', { params: { dateFrom, dateTo } });
    return response.data;
  },

  createVisit: async (data: CreateVisitData) => {
    const response = await api.post('/api/visits', data);
    return response.data;
  },

  updateVisit: async (id: string, data: UpdateVisitData) => {
    const response = await api.put(`/api/visits/${id}`, data);
    return response.data;
  },

  updateStatus: async (id: string, status: VisitStatus) => {
    const response = await api.patch(`/api/visits/${id}/status`, { status });
    return response.data;
  },

  deleteVisit: async (id: string) => {
    const response = await api.delete(`/api/visits/${id}`);
    return response.data;
  },
};
```

- [ ] **Step 3: Коммит**

```bash
git add client/src/types/visit.ts client/src/services/visitService.ts
git commit -m "feat(visits): add frontend types and API service"
```

---

## Task 7: Фронтенд — компоненты (VisitStatusBadge, VisitCard, VisitForm)

**Files:**
- Create: `client/src/components/visits/VisitStatusBadge.tsx`
- Create: `client/src/components/visits/VisitCard.tsx`
- Create: `client/src/components/visits/VisitForm.tsx`

- [ ] **Step 1: Создать VisitStatusBadge.tsx**

Цветовая индикация статусов визита — Chip из Material-UI.

- planned → синий (info)
- completed → зелёный (success)
- cancelled → серый (default)
- failed → красный (error)

- [ ] **Step 2: Создать VisitCard.tsx**

Карточка визита для списка — Card из MUI с: дата, компания, статус-бейдж, тип визита, комментарий (truncated).

- [ ] **Step 3: Создать VisitForm.tsx**

Форма создания/редактирования визита:
- Выбор компании (Select с поиском из API компаний)
- Дата и время (DateTimePicker)
- Тип визита (TextField)
- Комментарий (TextField multiline)
- Кнопки "Сохранить" / "Отмена"

- [ ] **Step 4: Коммит**

```bash
git add client/src/components/visits/
git commit -m "feat(visits): add VisitStatusBadge, VisitCard, VisitForm components"
```

---

## Task 8: Фронтенд — страницы (список, создание, детали, календарь)

**Files:**
- Create: `client/src/pages/visits/VisitsPage.tsx`
- Create: `client/src/pages/visits/VisitCreatePage.tsx`
- Create: `client/src/pages/visits/VisitDetailsPage.tsx`
- Create: `client/src/pages/visits/VisitCalendarPage.tsx`
- Modify: `client/src/App.tsx` — добавить маршруты
- Modify: `client/src/components/layout/Navbar.tsx` — добавить пункт меню

- [ ] **Step 1: Создать VisitsPage.tsx**

Список визитов с:
- Фильтры: статус, компания, дата от/до, поиск
- Таблица или список карточек VisitCard
- Пагинация
- Кнопка "Новый визит"

- [ ] **Step 2: Создать VisitCreatePage.tsx**

Страница с VisitForm. После успешного создания — редирект на список.

- [ ] **Step 3: Создать VisitDetailsPage.tsx**

Карточка визита с:
- Все поля визита
- Кнопки смены статуса (planned → completed / failed / cancelled)
- Кнопка "Редактировать"
- Кнопка "Удалить"

- [ ] **Step 4: Создать VisitCalendarPage.tsx**

Календарный вид визитов — простая таблица по дням (месяц). Каждая ячейка — список визитов на этот день. Навигация по месяцам.

- [ ] **Step 5: Добавить маршруты в App.tsx**

```typescript
<Route path="/visits" element={<VisitsPage />} />
<Route path="/visits/create" element={<VisitCreatePage />} />
<Route path="/visits/calendar" element={<VisitCalendarPage />} />
<Route path="/visits/:id" element={<VisitDetailsPage />} />
```

- [ ] **Step 6: Добавить пункт меню в Navbar.tsx**

Добавить иконку "Визиты" (EventNote или Explore из MUI icons) в навигацию, рядом с существующими пунктами.

- [ ] **Step 7: Коммит**

```bash
git add client/src/pages/visits/ client/src/App.tsx client/src/components/layout/Navbar.tsx
git commit -m "feat(visits): add pages, routes, and navbar menu item"
```

---

## Task 9: Запуск миграции и проверка

- [ ] **Step 1: Запустить миграцию**

```bash
docker compose exec opora_backend npm run migration:run
```

- [ ] **Step 2: Проверить API**

```bash
# Health check
curl http://localhost:5001/api/visits
# Должен вернуть { success: true, data: [], pagination: {...} }
```

- [ ] **Step 3: Проверить фронтенд**

- Навигация → "Визиты" → список (пустой)
- Кнопка "Новый визит" → форма
- Создать визит → появляется в списке
- Календарь → визит на нужной дате

- [ ] **Step 4: Коммит (если были фиксы)**

```bash
git commit -m "fix(visits): post-integration fixes"
```
