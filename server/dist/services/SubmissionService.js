"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubmissionService = exports.SubmissionService = void 0;
const BaseService_1 = require("./base/BaseService");
const Submission_entity_1 = require("../database/entities/Submission.entity");
const repositories_1 = require("../database/repositories");
const SubmissionHistory_entity_1 = require("../database/entities/SubmissionHistory.entity");
const database_config_1 = require("../database/config/database.config");
class SubmissionService extends BaseService_1.BaseService {
    constructor() {
        super((0, repositories_1.getSubmissionRepository)());
    }
    async createSubmission(data) {
        // Получение формы для денормализованных данных
        const formRepository = (0, repositories_1.getFormRepository)();
        const form = await formRepository.findById(data.formId);
        if (!form) {
            this.throwNotFound('Форма', data.formId);
        }
        // Получение пользователя для денормализованных данных
        let userData = null;
        if (data.userId) {
            const userRepository = (0, repositories_1.getUserRepository)();
            const user = await userRepository.findById(data.userId);
            if (user) {
                userData = {
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.fullName,
                };
            }
        }
        // Создание заявки
        const submission = await this.repository.create({
            formId: data.formId,
            userId: data.userId,
            title: data.title,
            status: 'C1:NEW',
            priority: data.priority || Submission_entity_1.SubmissionPriority.MEDIUM,
            notes: data.notes,
            tags: data.tags || [],
            bitrixDealId: data.bitrixDealId,
            bitrixSyncStatus: data.bitrixDealId ? Submission_entity_1.BitrixSyncStatus.SYNCED : Submission_entity_1.BitrixSyncStatus.PENDING,
            // Денормализованные данные
            formName: form.name,
            formTitle: form.title,
            userEmail: userData?.userEmail,
            userName: userData?.userName,
        });
        // Создание записи в истории
        await this.createHistoryEntry(submission.id, SubmissionHistory_entity_1.HistoryActionType.CREATE, 'Заявка создана', data.userId);
        return submission;
    }
    async updateSubmission(id, data, updatedBy) {
        const submission = await this.repository.findById(id);
        if (!submission) {
            this.throwNotFound('Заявка', id);
        }
        // Сохранение старых значений для истории
        const oldValues = {
            title: submission.title,
            status: submission.status,
            priority: submission.priority,
            assignedToId: submission.assignedToId,
        };
        // Обновление заявки
        const updated = await this.repository.update(id, data);
        if (!updated)
            return null;
        // Создание записей в истории для изменений
        const changes = [];
        if (data.status && data.status !== oldValues.status) {
            await this.createHistoryEntry(id, SubmissionHistory_entity_1.HistoryActionType.STATUS_CHANGE, `Статус изменен с "${oldValues.status}" на "${data.status}"`, updatedBy, [{ field: 'status', oldValue: oldValues.status, newValue: data.status }]);
        }
        if (data.assignedToId !== undefined && data.assignedToId !== oldValues.assignedToId) {
            const userRepository = (0, repositories_1.getUserRepository)();
            const newAssignee = data.assignedToId ? await userRepository.findById(data.assignedToId) : null;
            await this.createHistoryEntry(id, SubmissionHistory_entity_1.HistoryActionType.ASSIGN, newAssignee
                ? `Заявка назначена на ${newAssignee.fullName}`
                : 'Назначение заявки снято', updatedBy, [{ field: 'assignedToId', oldValue: oldValues.assignedToId, newValue: data.assignedToId }]);
        }
        // Общее обновление для остальных полей
        Object.keys(data).forEach(key => {
            if (key !== 'status' && key !== 'assignedToId' && data[key] !== oldValues[key]) {
                changes.push({
                    field: key,
                    oldValue: oldValues[key],
                    newValue: data[key],
                });
            }
        });
        if (changes.length > 0) {
            await this.createHistoryEntry(id, SubmissionHistory_entity_1.HistoryActionType.UPDATE, 'Заявка обновлена', updatedBy, changes);
        }
        return updated;
    }
    async findBySubmissionNumber(submissionNumber) {
        return this.repository.findBySubmissionNumber(submissionNumber);
    }
    async searchSubmissions(params) {
        return this.repository.findWithFilters(params, params);
    }
    async findPendingSync(limit = 100) {
        return this.repository.findPendingSync(limit);
    }
    async findByBitrixDealId(bitrixDealId) {
        return this.repository.findByBitrixDealId(bitrixDealId);
    }
    async updateSyncStatus(submissionId, status, bitrixDealId, error) {
        const result = await this.repository.updateSyncStatus(submissionId, status, bitrixDealId, error);
        if (result) {
            await this.createHistoryEntry(submissionId, SubmissionHistory_entity_1.HistoryActionType.SYNC_BITRIX, status === Submission_entity_1.BitrixSyncStatus.SYNCED
                ? `Синхронизация с Bitrix24 успешна (ID: ${bitrixDealId})`
                : `Ошибка синхронизации с Bitrix24: ${error}`, undefined, undefined, { bitrixDealId, error });
        }
        return result;
    }
    async assignToUser(submissionId, userId, assignedBy) {
        const submission = await this.repository.findById(submissionId);
        if (!submission) {
            this.throwNotFound('Заявка', submissionId);
        }
        const result = await this.repository.assignToUser(submissionId, userId);
        if (result && userId) {
            const userRepository = (0, repositories_1.getUserRepository)();
            const user = await userRepository.findById(userId);
            await this.createHistoryEntry(submissionId, SubmissionHistory_entity_1.HistoryActionType.ASSIGN, user ? `Заявка назначена на ${user.fullName}` : 'Заявка назначена', assignedBy);
        }
        return result;
    }
    async updateStatus(submissionId, status, updatedBy) {
        const submission = await this.repository.findById(submissionId);
        if (!submission) {
            this.throwNotFound('Заявка', submissionId);
        }
        const oldStatus = submission.status;
        const result = await this.repository.updateStatus(submissionId, status);
        if (result) {
            await this.createHistoryEntry(submissionId, SubmissionHistory_entity_1.HistoryActionType.STATUS_CHANGE, `Статус изменен с "${oldStatus}" на "${status}"`, updatedBy, [{ field: 'status', oldValue: oldStatus, newValue: status }]);
        }
        return result;
    }
    async addTags(submissionId, tags, updatedBy) {
        const result = await this.repository.addTags(submissionId, tags);
        if (result) {
            await this.createHistoryEntry(submissionId, SubmissionHistory_entity_1.HistoryActionType.UPDATE, `Добавлены теги: ${tags.join(', ')}`, updatedBy);
        }
        return result;
    }
    async removeTags(submissionId, tags, updatedBy) {
        const result = await this.repository.removeTags(submissionId, tags);
        if (result) {
            await this.createHistoryEntry(submissionId, SubmissionHistory_entity_1.HistoryActionType.UPDATE, `Удалены теги: ${tags.join(', ')}`, updatedBy);
        }
        return result;
    }
    async addComment(submissionId, comment, userId) {
        const submission = await this.repository.findById(submissionId);
        if (!submission) {
            this.throwNotFound('Заявка', submissionId);
        }
        await this.createHistoryEntry(submissionId, SubmissionHistory_entity_1.HistoryActionType.COMMENT, comment, userId);
        return true;
    }
    async getStatistics(filters) {
        return this.repository.getStatistics(filters);
    }
    async getUnassignedSubmissions() {
        return this.repository.getUnassignedSubmissions();
    }
    async getOverdueSubmissions(daysOverdue = 3) {
        return this.repository.getOverdueSubmissions(daysOverdue);
    }
    async getSubmissionHistory(submissionId) {
        const historyRepository = database_config_1.AppDataSource.getRepository(SubmissionHistory_entity_1.SubmissionHistory);
        return historyRepository.find({
            where: { submissionId },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }
    async createHistoryEntry(submissionId, actionType, description, userId, changes, metadata) {
        const historyRepository = database_config_1.AppDataSource.getRepository(SubmissionHistory_entity_1.SubmissionHistory);
        const entry = SubmissionHistory_entity_1.SubmissionHistory.createEntry(submissionId, actionType, description, userId, changes, metadata);
        await historyRepository.save(entry);
    }
    async getUserSubmissions(userId, filters) {
        return this.repository.findWithFilters({ ...filters, userId }, { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'DESC' });
    }
    async getAssignedSubmissions(assignedToId, filters) {
        return this.repository.findWithFilters({ ...filters, assignedToId }, { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'DESC' });
    }
    async createFromFormData(formId, formData, userId) {
        // Получение формы
        const formRepository = (0, repositories_1.getFormRepository)();
        const form = await formRepository.findWithFields(formId);
        if (!form) {
            this.throwNotFound('Форма', formId);
        }
        // Генерация заголовка заявки
        const title = this.generateSubmissionTitle(form.title, formData);
        // Создание заявки
        return this.createSubmission({
            formId,
            userId,
            title,
            priority: Submission_entity_1.SubmissionPriority.MEDIUM,
        });
    }
    generateSubmissionTitle(formTitle, formData) {
        // Попытка найти имя или email в данных формы
        const name = formData.name || formData.firstName || formData.fullName;
        const email = formData.email;
        const phone = formData.phone;
        if (name) {
            return `${formTitle} - ${name}`;
        }
        else if (email) {
            return `${formTitle} - ${email}`;
        }
        else if (phone) {
            return `${formTitle} - ${phone}`;
        }
        return `${formTitle} - ${new Date().toLocaleString('ru-RU')}`;
    }
}
exports.SubmissionService = SubmissionService;
// Синглтон для сервиса
let submissionService = null;
const getSubmissionService = () => {
    if (!submissionService) {
        submissionService = new SubmissionService();
    }
    return submissionService;
};
exports.getSubmissionService = getSubmissionService;
