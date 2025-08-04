"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizedSubmissionService = exports.OptimizedSubmissionService = void 0;
const Submission_1 = __importDefault(require("../models/Submission"));
const User_1 = __importDefault(require("../models/User"));
const Form_1 = __importDefault(require("../models/Form"));
/**
 * Оптимизированный сервис для работы с заявками
 * Использует денормализованные данные вместо populate для лучшей производительности
 */
class OptimizedSubmissionService {
    /**
     * Получение заявок с оптимизированными запросами
     */
    getSubmissions() {
        return __awaiter(this, arguments, void 0, function* (filters = {}, pagination) {
            const query = {};
            // Построение фильтров с использованием индексов
            if (filters.status) {
                query.status = Array.isArray(filters.status)
                    ? { $in: filters.status }
                    : filters.status;
            }
            if (filters.priority) {
                query.priority = Array.isArray(filters.priority)
                    ? { $in: filters.priority }
                    : filters.priority;
            }
            if (filters.assignedTo) {
                query.assignedTo = filters.assignedTo;
            }
            if (filters.userId) {
                query.userId = filters.userId;
            }
            if (filters.formId) {
                query.formId = filters.formId;
            }
            if (filters.bitrixSyncStatus) {
                query.bitrixSyncStatus = filters.bitrixSyncStatus;
            }
            if (filters.tags && filters.tags.length > 0) {
                query.tags = { $in: filters.tags };
            }
            // Фильтр по дате (использует индекс createdAt)
            if (filters.dateFrom || filters.dateTo) {
                query.createdAt = {};
                if (filters.dateFrom) {
                    query.createdAt.$gte = new Date(filters.dateFrom);
                }
                if (filters.dateTo) {
                    query.createdAt.$lte = new Date(filters.dateTo);
                }
            }
            // Поиск по тексту в денормализованных полях (без populate!)
            if (filters.search) {
                const searchRegex = { $regex: filters.search, $options: 'i' };
                query.$or = [
                    { title: searchRegex },
                    { submissionNumber: searchRegex },
                    { userEmail: searchRegex },
                    { userName: searchRegex },
                    { formName: searchRegex },
                    { formTitle: searchRegex },
                    { assignedToName: searchRegex },
                    { notes: searchRegex }
                ];
            }
            // Подсчет общего количества
            const total = yield Submission_1.default.countDocuments(query);
            // Построение запроса с пагинацией
            const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
            // Выполнение оптимизированного запроса БЕЗ populate
            const submissions = yield Submission_1.default.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .select({
                // Выбираем только нужные поля для уменьшения объема данных
                submissionNumber: 1,
                title: 1,
                status: 1,
                priority: 1,
                bitrixDealId: 1,
                bitrixSyncStatus: 1,
                createdAt: 1,
                updatedAt: 1,
                notes: 1,
                tags: 1,
                // Денормализованные поля (без populate!)
                formName: 1,
                formTitle: 1,
                userEmail: 1,
                userName: 1,
                assignedToName: 1,
                // Предвычисленные поля
                processingTimeMinutes: 1,
                dayOfWeek: 1,
                monthOfYear: 1,
                yearCreated: 1
            })
                .lean(); // Возвращает plain objects для лучшей производительности
            return {
                success: true,
                data: submissions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        });
    }
    /**
     * Получение заявок пользователя (оптимизировано)
     */
    getUserSubmissions(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, filters = {}, pagination) {
            return this.getSubmissions(Object.assign(Object.assign({}, filters), { userId }), pagination);
        });
    }
    /**
     * Получение заявок ответственного (оптимизировано)
     */
    getAssignedSubmissions(assignedTo_1) {
        return __awaiter(this, arguments, void 0, function* (assignedTo, filters = {}, pagination) {
            return this.getSubmissions(Object.assign(Object.assign({}, filters), { assignedTo }), pagination);
        });
    }
    /**
     * Batch загрузка связанных данных только при необходимости
     */
    batchLoadRelatedData(submissionIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const submissions = yield Submission_1.default.find({
                _id: { $in: submissionIds }
            }).select('formId userId assignedTo');
            const formIds = [...new Set(submissions.map(s => s.formId).filter(Boolean))];
            const userIds = [...new Set([
                    ...submissions.map(s => s.userId).filter(Boolean),
                    ...submissions.map(s => s.assignedTo).filter(Boolean)
                ])];
            // Параллельная загрузка связанных данных
            const [forms, users] = yield Promise.all([
                formIds.length > 0 ? Form_1.default.find({ _id: { $in: formIds } }).select('name title').lean() : [],
                userIds.length > 0 ? User_1.default.find({ _id: { $in: userIds } }).select('email firstName lastName').lean() : []
            ]);
            // Создаем maps для быстрого поиска
            const formsMap = new Map(forms.map(f => [f._id.toString(), f]));
            const usersMap = new Map(users.map(u => [u._id.toString(), u]));
            return { formsMap, usersMap };
        });
    }
    /**
     * Получение статистики по заявкам (использует денормализованные поля)
     */
    getSubmissionStats() {
        return __awaiter(this, arguments, void 0, function* (filters = {}) {
            const matchStage = {};
            // Применяем те же фильтры, что и в основном методе
            if (filters.dateFrom || filters.dateTo) {
                matchStage.createdAt = {};
                if (filters.dateFrom)
                    matchStage.createdAt.$gte = new Date(filters.dateFrom);
                if (filters.dateTo)
                    matchStage.createdAt.$lte = new Date(filters.dateTo);
            }
            if (filters.assignedTo)
                matchStage.assignedTo = filters.assignedTo;
            if (filters.userId)
                matchStage.userId = filters.userId;
            if (filters.formId)
                matchStage.formId = filters.formId;
            const stats = yield Submission_1.default.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalSubmissions: { $sum: 1 },
                        byStatus: {
                            $push: {
                                status: '$status',
                                count: 1
                            }
                        },
                        byPriority: {
                            $push: {
                                priority: '$priority',
                                count: 1
                            }
                        },
                        byForm: {
                            $push: {
                                formName: '$formName',
                                count: 1
                            }
                        },
                        avgProcessingTime: { $avg: '$processingTimeMinutes' },
                        totalProcessingTime: { $sum: '$processingTimeMinutes' }
                    }
                }
            ]);
            return stats[0] || {
                totalSubmissions: 0,
                byStatus: [],
                byPriority: [],
                byForm: [],
                avgProcessingTime: 0,
                totalProcessingTime: 0
            };
        });
    }
    /**
     * Обновление денормализованных данных для существующих заявок
     */
    updateDenormalizedData(submissionIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = submissionIds
                ? { _id: { $in: submissionIds } }
                : {};
            const submissions = yield Submission_1.default.find(query);
            console.log(`🔄 Обновление денормализованных данных для ${submissions.length} заявок`);
            for (const submission of submissions) {
                // Принудительно пересохраняем для срабатывания pre-save hooks
                yield submission.save();
            }
            console.log(`✅ Обновлено ${submissions.length} заявок`);
            return submissions.length;
        });
    }
}
exports.OptimizedSubmissionService = OptimizedSubmissionService;
exports.optimizedSubmissionService = new OptimizedSubmissionService();
