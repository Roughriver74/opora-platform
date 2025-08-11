"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmissionRepository = void 0;
const BaseRepository_1 = require("./base/BaseRepository");
const Submission_entity_1 = require("../entities/Submission.entity");
const typeorm_1 = require("typeorm");
class SubmissionRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(Submission_entity_1.Submission, 'submission');
        this.cacheTTL = 300; // 5 минут для заявок
    }
    async findBySubmissionNumber(submissionNumber) {
        return this.repository.findOne({
            where: { submissionNumber },
            relations: ['user', 'form', 'assignedTo'],
        });
    }
    async findWithFilters(filters, pagination) {
        const queryBuilder = this.createQueryBuilder('submission')
            .leftJoinAndSelect('submission.user', 'user')
            .leftJoinAndSelect('submission.form', 'form')
            .leftJoinAndSelect('submission.assignedTo', 'assignedTo');
        // Применение фильтров
        if (filters.status) {
            if (Array.isArray(filters.status)) {
                queryBuilder.andWhere('submission.status IN (:...statuses)', {
                    statuses: filters.status
                });
            }
            else {
                queryBuilder.andWhere('submission.status = :status', {
                    status: filters.status
                });
            }
        }
        if (filters.priority) {
            queryBuilder.andWhere('submission.priority = :priority', {
                priority: filters.priority
            });
        }
        if (filters.userId) {
            queryBuilder.andWhere('submission.userId = :userId', {
                userId: filters.userId
            });
        }
        if (filters.assignedToId) {
            queryBuilder.andWhere('submission.assignedToId = :assignedToId', {
                assignedToId: filters.assignedToId
            });
        }
        if (filters.formId) {
            queryBuilder.andWhere('submission.formId = :formId', {
                formId: filters.formId
            });
        }
        if (filters.bitrixSyncStatus) {
            queryBuilder.andWhere('submission.bitrixSyncStatus = :syncStatus', {
                syncStatus: filters.bitrixSyncStatus
            });
        }
        if (filters.tags && filters.tags.length > 0) {
            queryBuilder.andWhere('submission.tags && :tags', {
                tags: filters.tags
            });
        }
        if (filters.dateFrom && filters.dateTo) {
            queryBuilder.andWhere('submission.createdAt BETWEEN :dateFrom AND :dateTo', {
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
            });
        }
        if (filters.search) {
            queryBuilder.andWhere('(submission.submissionNumber LIKE :search OR ' +
                'submission.title LIKE :search OR ' +
                'submission.userEmail LIKE :search OR ' +
                'submission.userName LIKE :search)', { search: `%${filters.search}%` });
        }
        // Подсчет общего количества
        const total = await queryBuilder.getCount();
        // Применение пагинации
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 20;
        const offset = (page - 1) * limit;
        queryBuilder.skip(offset).take(limit);
        // Сортировка
        const sortBy = pagination?.sortBy || 'createdAt';
        const sortOrder = pagination?.sortOrder || 'DESC';
        queryBuilder.orderBy(`submission.${sortBy}`, sortOrder);
        const data = await queryBuilder.getMany();
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        };
    }
    async findPendingSync(limit = 100) {
        return this.repository.find({
            where: {
                bitrixSyncStatus: Submission_entity_1.BitrixSyncStatus.PENDING,
            },
            order: {
                createdAt: 'ASC',
            },
            take: limit,
        });
    }
    async findByBitrixDealId(bitrixDealId) {
        return this.repository.findOne({
            where: { bitrixDealId },
            relations: ['user', 'form'],
        });
    }
    async updateSyncStatus(submissionId, status, bitrixDealId, error) {
        const updateData = {
            bitrixSyncStatus: status,
        };
        if (bitrixDealId) {
            updateData.bitrixDealId = bitrixDealId;
        }
        if (error) {
            updateData.bitrixSyncError = error;
        }
        const result = await this.repository.update(submissionId, updateData);
        await this.invalidateCache(submissionId);
        return result.affected ? result.affected > 0 : false;
    }
    async getStatistics(filters) {
        const cacheKey = `${this.cachePrefix}:stats:${JSON.stringify(filters || {})}`;
        const cached = await this.cacheGet(cacheKey);
        if (cached)
            return cached;
        const queryBuilder = this.createQueryBuilder('submission');
        // Применение базовых фильтров
        if (filters?.userId) {
            queryBuilder.where('submission.userId = :userId', { userId: filters.userId });
        }
        if (filters?.formId) {
            queryBuilder.andWhere('submission.formId = :formId', { formId: filters.formId });
        }
        // Общее количество
        const total = await queryBuilder.getCount();
        // По статусам
        const byStatus = await this.repository
            .createQueryBuilder('submission')
            .select('submission.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('submission.status')
            .getRawMany();
        // По приоритетам
        const byPriority = await this.repository
            .createQueryBuilder('submission')
            .select('submission.priority', 'priority')
            .addSelect('COUNT(*)', 'count')
            .groupBy('submission.priority')
            .getRawMany();
        // По формам
        const byForm = await this.repository
            .createQueryBuilder('submission')
            .select('submission.formName', 'formName')
            .addSelect('COUNT(*)', 'count')
            .groupBy('submission.formName')
            .getRawMany();
        // Среднее время обработки
        const avgProcessing = await this.repository
            .createQueryBuilder('submission')
            .select('AVG(submission.processingTimeMinutes)', 'avg')
            .where('submission.processingTimeMinutes IS NOT NULL')
            .getRawOne();
        // Подсчеты за периоды
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const todayCount = await this.repository.count({
            where: { createdAt: (0, typeorm_1.Between)(todayStart, now) },
        });
        const weekCount = await this.repository.count({
            where: { createdAt: (0, typeorm_1.Between)(weekStart, now) },
        });
        const monthCount = await this.repository.count({
            where: { createdAt: (0, typeorm_1.Between)(monthStart, now) },
        });
        const statistics = {
            total,
            byStatus: byStatus.reduce((acc, item) => {
                acc[item.status] = parseInt(item.count);
                return acc;
            }, {}),
            byPriority: byPriority.reduce((acc, item) => {
                acc[item.priority] = parseInt(item.count);
                return acc;
            }, {}),
            byForm: byForm.reduce((acc, item) => {
                acc[item.formName || 'Unknown'] = parseInt(item.count);
                return acc;
            }, {}),
            avgProcessingTime: Math.round(avgProcessing?.avg || 0),
            todayCount,
            weekCount,
            monthCount,
        };
        // Кеширование на 5 минут
        await this.cacheSet(cacheKey, statistics, 300);
        return statistics;
    }
    async assignToUser(submissionId, userId) {
        const submission = await this.findById(submissionId);
        if (!submission)
            return false;
        submission.assignedToId = userId || undefined;
        // Обновление денормализованного поля будет выполнено в @BeforeUpdate
        await this.repository.save(submission);
        await this.invalidateCache(submissionId);
        return true;
    }
    async updateStatus(submissionId, status) {
        const submission = await this.findById(submissionId);
        if (!submission)
            return false;
        submission.status = status;
        // Обновление времени обработки будет выполнено в @BeforeUpdate
        await this.repository.save(submission);
        await this.invalidateCache(submissionId);
        return true;
    }
    async addTags(submissionId, tags) {
        const submission = await this.findById(submissionId);
        if (!submission)
            return false;
        submission.tags = [...new Set([...submission.tags, ...tags])];
        await this.repository.save(submission);
        await this.invalidateCache(submissionId);
        return true;
    }
    async removeTags(submissionId, tags) {
        const submission = await this.findById(submissionId);
        if (!submission)
            return false;
        submission.tags = submission.tags.filter(tag => !tags.includes(tag));
        await this.repository.save(submission);
        await this.invalidateCache(submissionId);
        return true;
    }
    async getUnassignedSubmissions() {
        return this.repository.find({
            where: {
                assignedToId: (0, typeorm_1.IsNull)(),
                status: (0, typeorm_1.Not)((0, typeorm_1.In)(['WON', 'LOSE', 'COMPLETED', 'CLOSED'])),
            },
            order: {
                priority: 'DESC',
                createdAt: 'ASC',
            },
            relations: ['form', 'user'],
        });
    }
    async getOverdueSubmissions(daysOverdue = 3) {
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - daysOverdue);
        return this.repository.find({
            where: {
                createdAt: (0, typeorm_1.Not)((0, typeorm_1.Between)(overdueDate, new Date())),
                status: (0, typeorm_1.Not)((0, typeorm_1.In)(['WON', 'LOSE', 'COMPLETED', 'CLOSED'])),
            },
            order: {
                createdAt: 'ASC',
            },
            relations: ['form', 'user', 'assignedTo'],
        });
    }
}
exports.SubmissionRepository = SubmissionRepository;
