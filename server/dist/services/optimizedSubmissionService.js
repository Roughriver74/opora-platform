"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizedSubmissionService = exports.OptimizedSubmissionService = void 0;
const database_config_1 = require("../database/config/database.config");
const Submission_entity_1 = require("../database/entities/Submission.entity");
/**
 * Оптимизированный сервис для работы с заявками
 * Использует денормализованные данные вместо joins для лучшей производительности
 */
class OptimizedSubmissionService {
    constructor() {
        this.submissionRepository = database_config_1.AppDataSource.getRepository(Submission_entity_1.Submission);
    }
    /**
     * Получение заявок с оптимизированными запросами
     */
    async getSubmissions(filters = {}, pagination) {
        const queryBuilder = this.submissionRepository.createQueryBuilder('submission');
        // Построение фильтров с использованием индексов
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                queryBuilder.andWhere('submission.status IN (:...statuses)', { statuses: filters.status });
            }
            else {
                queryBuilder.andWhere('submission.status = :status', { status: filters.status });
            }
        }
        if (filters.priority) {
            if (Array.isArray(filters.priority)) {
                queryBuilder.andWhere('submission.priority IN (:...priorities)', { priorities: filters.priority });
            }
            else {
                queryBuilder.andWhere('submission.priority = :priority', { priority: filters.priority });
            }
        }
        if (filters.assignedTo) {
            queryBuilder.andWhere('submission.assignedToId = :assignedTo', { assignedTo: filters.assignedTo });
        }
        if (filters.userId) {
            queryBuilder.andWhere('submission.userId = :userId', { userId: filters.userId });
        }
        if (filters.formId) {
            queryBuilder.andWhere('submission.formId = :formId', { formId: filters.formId });
        }
        if (filters.bitrixSyncStatus) {
            queryBuilder.andWhere('submission.bitrixSyncStatus = :bitrixSyncStatus', { bitrixSyncStatus: filters.bitrixSyncStatus });
        }
        if (filters.tags && filters.tags.length > 0) {
            queryBuilder.andWhere('submission.tags && ARRAY[:...tags]', { tags: filters.tags });
        }
        // Фильтр по дате (использует индекс createdAt)
        if (filters.dateFrom) {
            queryBuilder.andWhere('submission.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
        }
        if (filters.dateTo) {
            queryBuilder.andWhere('submission.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
        }
        // Поиск по тексту в денормализованных полях (используем PostgreSQL full-text search)
        if (filters.search) {
            queryBuilder.andWhere(`(
				submission.title ILIKE :search OR 
				submission.submissionNumber ILIKE :search OR
				submission.userEmail ILIKE :search OR
				submission.userName ILIKE :search OR
				submission.formName ILIKE :search OR
				submission.formTitle ILIKE :search OR
				submission.assignedToName ILIKE :search OR
				submission.notes ILIKE :search
			)`, { search: `%${filters.search}%` });
        }
        // Подсчет общего количества
        const total = await queryBuilder.getCount();
        // Построение запроса с пагинацией
        const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
        const skip = (page - 1) * limit;
        // Применяем сортировку
        queryBuilder.orderBy(`submission.${sortBy}`, sortOrder.toUpperCase());
        // Применяем пагинацию
        queryBuilder.skip(skip).take(limit);
        // Выбираем только нужные поля для уменьшения объема данных
        queryBuilder.select([
            'submission.id',
            'submission.submissionNumber',
            'submission.title',
            'submission.status',
            'submission.priority',
            'submission.bitrixDealId',
            'submission.bitrixSyncStatus',
            'submission.createdAt',
            'submission.updatedAt',
            'submission.notes',
            'submission.tags',
            // Денормализованные поля (без joins!)
            'submission.formName',
            'submission.formTitle',
            'submission.userEmail',
            'submission.userName',
            'submission.assignedToName',
            // Предвычисленные поля
            'submission.processingTimeMinutes',
            'submission.dayOfWeek',
            'submission.monthOfYear',
        ]);
        // Выполнение оптимизированного запроса
        const submissions = await queryBuilder.getMany();
        return {
            data: submissions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
            performance: {
                denormalized: true, // Подтверждаем использование денормализованных данных
                optimizedQueries: true,
                usesFTS: !!filters.search, // Full-text search
            },
        };
    }
    /**
     * Получение заявок пользователя (оптимизированная версия)
     */
    async getUserSubmissions(userId, filters = {}, pagination) {
        // Добавляем фильтр по пользователю
        const userFilters = { ...filters, userId };
        return this.getSubmissions(userFilters, pagination);
    }
    /**
     * Статистика по заявкам (используя денормализованные поля)
     */
    async getSubmissionStats(filters = {}) {
        const baseQuery = this.submissionRepository.createQueryBuilder('submission');
        // Применяем те же фильтры что и в getSubmissions
        this.applyFilters(baseQuery, filters);
        const [totalCount, statusStats, priorityStats, monthlyStats,] = await Promise.all([
            baseQuery.getCount(),
            // Статистика по статусам
            baseQuery.clone()
                .select('submission.status', 'status')
                .addSelect('COUNT(*)', 'count')
                .groupBy('submission.status')
                .getRawMany(),
            // Статистика по приоритетам
            baseQuery.clone()
                .select('submission.priority', 'priority')
                .addSelect('COUNT(*)', 'count')
                .groupBy('submission.priority')
                .getRawMany(),
            // Статистика по месяцам (используя предвычисленное поле)
            baseQuery.clone()
                .select('submission.monthOfYear', 'month')
                .addSelect('COUNT(*)', 'count')
                .groupBy('submission.monthOfYear')
                .orderBy('submission.monthOfYear', 'ASC')
                .getRawMany(),
        ]);
        return {
            total: totalCount,
            byStatus: statusStats,
            byPriority: priorityStats,
            byMonth: monthlyStats,
            performance: {
                denormalized: true,
                precomputedFields: true,
            },
        };
    }
    /**
     * Вспомогательный метод для применения фильтров
     */
    applyFilters(queryBuilder, filters) {
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                queryBuilder.andWhere('submission.status IN (:...statuses)', { statuses: filters.status });
            }
            else {
                queryBuilder.andWhere('submission.status = :status', { status: filters.status });
            }
        }
        if (filters.priority) {
            if (Array.isArray(filters.priority)) {
                queryBuilder.andWhere('submission.priority IN (:...priorities)', { priorities: filters.priority });
            }
            else {
                queryBuilder.andWhere('submission.priority = :priority', { priority: filters.priority });
            }
        }
        if (filters.userId) {
            queryBuilder.andWhere('submission.userId = :userId', { userId: filters.userId });
        }
        if (filters.formId) {
            queryBuilder.andWhere('submission.formId = :formId', { formId: filters.formId });
        }
        if (filters.dateFrom) {
            queryBuilder.andWhere('submission.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
        }
        if (filters.dateTo) {
            queryBuilder.andWhere('submission.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
        }
        if (filters.search) {
            queryBuilder.andWhere(`(
				submission.title ILIKE :search OR 
				submission.submissionNumber ILIKE :search OR
				submission.userEmail ILIKE :search OR
				submission.userName ILIKE :search OR
				submission.formName ILIKE :search OR
				submission.formTitle ILIKE :search OR
				submission.assignedToName ILIKE :search OR
				submission.notes ILIKE :search
			)`, { search: `%${filters.search}%` });
        }
    }
    /**
     * Обновление денормализованных данных для заявок
     */
    async updateDenormalizedData(submissionIds) {
        const queryBuilder = this.submissionRepository.createQueryBuilder('submission')
            .leftJoin('submission.user', 'user')
            .leftJoin('submission.form', 'form')
            .leftJoin('submission.assignedTo', 'assignedTo');
        if (submissionIds && submissionIds.length > 0) {
            queryBuilder.where('submission.id IN (:...ids)', { ids: submissionIds });
        }
        const submissions = await queryBuilder
            .select([
            'submission.id',
            'user.email',
            'user.firstName',
            'user.lastName',
            'form.name',
            'form.title',
            'assignedTo.firstName',
            'assignedTo.lastName'
        ])
            .getMany();
        let updatedCount = 0;
        for (const submission of submissions) {
            const userName = submission.user
                ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim()
                : undefined;
            const assignedToName = submission.assignedTo
                ? `${submission.assignedTo.firstName || ''} ${submission.assignedTo.lastName || ''}`.trim()
                : undefined;
            await this.submissionRepository.update(submission.id, {
                userEmail: submission.user?.email,
                userName: userName,
                formName: submission.form?.name,
                formTitle: submission.form?.title,
                assignedToName: assignedToName,
            });
            updatedCount++;
        }
        return updatedCount;
    }
}
exports.OptimizedSubmissionService = OptimizedSubmissionService;
// Экспорт единственного экземпляра для использования
exports.optimizedSubmissionService = new OptimizedSubmissionService();
