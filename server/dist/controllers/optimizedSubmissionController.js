"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDenormalizedData = exports.getSubmissionStats = exports.getOptimizedUserSubmissions = exports.getOptimizedSubmissions = void 0;
const optimizedSubmissionService_1 = require("../services/optimizedSubmissionService");
/**
 * Оптимизированные методы для работы с заявками
 * Используют денормализованные данные и избегают populate операций
 */
// Получение всех заявок (для админов) - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
const getOptimizedSubmissions = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, priority, assignedTo, userId, dateFrom, dateTo, search, tags, formId, bitrixSyncStatus, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        // Подготовка фильтров
        const filters = {
            status: status,
            priority: priority,
            assignedTo: assignedTo,
            userId: userId,
            dateFrom: dateFrom,
            dateTo: dateTo,
            search: search,
            tags: Array.isArray(tags) ? tags : tags ? [tags] : undefined,
            formId: formId,
            bitrixSyncStatus: bitrixSyncStatus
        };
        // Подготовка пагинации
        const pagination = {
            page: Number(page),
            limit: Number(limit),
            sortBy: sortBy,
            sortOrder: sortOrder
        };
        console.log(`🚀 Оптимизированный запрос заявок: страница ${page}, лимит ${limit}`);
        // Используем оптимизированный сервис (БЕЗ populate!)
        const result = await optimizedSubmissionService_1.optimizedSubmissionService.getSubmissions(filters, pagination);
        console.log(`✅ Получено ${result.data.length} заявок из ${result.pagination.total}`);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Ошибка при получении заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении заявок',
            error: error.message,
        });
    }
};
exports.getOptimizedSubmissions = getOptimizedSubmissions;
// Получение заявок пользователя - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
const getOptimizedUserSubmissions = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Пользователь не авторизован'
            });
            return;
        }
        const { page = 1, limit = 20, status, priority, dateFrom, dateTo, search, tags, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        const filters = {
            status: status,
            priority: priority,
            dateFrom: dateFrom,
            dateTo: dateTo,
            search: search,
            tags: Array.isArray(tags) ? tags : tags ? [tags] : undefined,
        };
        const pagination = {
            page: Number(page),
            limit: Number(limit),
            sortBy: sortBy,
            sortOrder: sortOrder
        };
        console.log(`🚀 Оптимизированный запрос заявок пользователя ${userId}`);
        const result = await optimizedSubmissionService_1.optimizedSubmissionService.getUserSubmissions(userId, filters, pagination);
        console.log(`✅ Получено ${result.data.length} заявок пользователя`);
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Ошибка при получении заявок пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении заявок пользователя',
            error: error.message,
        });
    }
};
exports.getOptimizedUserSubmissions = getOptimizedUserSubmissions;
// Получение статистики по заявкам - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
const getSubmissionStats = async (req, res) => {
    try {
        const { assignedTo, userId, dateFrom, dateTo, formId } = req.query;
        const filters = {
            assignedTo: assignedTo,
            userId: userId,
            dateFrom: dateFrom,
            dateTo: dateTo,
            formId: formId
        };
        console.log('🚀 Оптимизированный запрос статистики заявок');
        const stats = await optimizedSubmissionService_1.optimizedSubmissionService.getSubmissionStats(filters);
        console.log('✅ Получена статистика заявок');
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении статистики',
            error: error.message,
        });
    }
};
exports.getSubmissionStats = getSubmissionStats;
// Обновление денормализованных данных
const updateDenormalizedData = async (req, res) => {
    try {
        const { submissionIds } = req.body;
        console.log('🔄 Запуск обновления денормализованных данных');
        const updatedCount = await optimizedSubmissionService_1.optimizedSubmissionService.updateDenormalizedData(submissionIds ? submissionIds : undefined);
        res.status(200).json({
            success: true,
            message: `Обновлено ${updatedCount} заявок`,
            updatedCount
        });
    }
    catch (error) {
        console.error('Ошибка при обновлении денормализованных данных:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при обновлении денормализованных данных',
            error: error.message,
        });
    }
};
exports.updateDenormalizedData = updateDenormalizedData;
