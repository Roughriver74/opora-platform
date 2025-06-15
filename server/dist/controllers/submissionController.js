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
exports.getBitrixStages = exports.deleteSubmission = exports.updateSubmission = exports.updateSubmissionStatus = exports.getSubmissionById = exports.getMySubmissions = exports.getAllSubmissions = exports.submitForm = void 0;
const Form_1 = __importDefault(require("../models/Form"));
const Submission_1 = __importDefault(require("../models/Submission"));
const SubmissionHistory_1 = __importDefault(require("../models/SubmissionHistory"));
const User_1 = __importDefault(require("../models/User"));
const bitrix24Service_1 = __importDefault(require("../services/bitrix24Service"));
// Обработка отправки формы заявки
const submitForm = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { formId, formData } = req.body;
        if (!formId || !formData) {
            return res
                .status(400)
                .json({ message: 'Необходимо указать ID формы и данные формы' });
        }
        // Получаем форму с полями
        const form = yield Form_1.default.findById(formId).populate('fields');
        if (!form) {
            return res.status(404).json({ message: 'Форма не найдена' });
        }
        // Проверяем, активна ли форма
        if (!form.isActive) {
            return res.status(400).json({ message: 'Форма не активна' });
        }
        // Создаем заявку в базе данных
        const submission = new Submission_1.default({
            formId: formId,
            userId: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null, // Если пользователь авторизован
            formData: formData,
            status: 'NEW',
            priority: 'medium',
            bitrixSyncStatus: 'pending',
        });
        yield submission.save();
        // Подготавливаем данные для создания сделки в Битрикс24
        const dealData = {
            TITLE: `Заявка #${submission.submissionNumber}`,
            STAGE_ID: 'NEW', // Начальный статус
        };
        // Если пользователь авторизован, добавляем информацию о нем
        if ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) {
            const user = yield User_1.default.findById(req.user.id);
            if (user) {
                dealData['ASSIGNED_BY_ID'] = user.bitrix_id || user._id.toString();
                dealData['CONTACT_ID'] = user.bitrix_id; // Если у пользователя есть Битрикс ID
            }
        }
        // Проходим по всем полям формы и заполняем данные для сделки
        for (const field of form.fields) {
            // Проверяем, есть ли значение для этого поля
            if (formData[field.name] !== undefined) {
                // Маппинг поля формы на поле Битрикс24
                dealData[field.bitrixFieldId] = formData[field.name];
            }
            else if (field.required) {
                // Если поле обязательное, но значение не предоставлено
                return res
                    .status(400)
                    .json({ message: `Поле "${field.label}" обязательно для заполнения` });
            }
        }
        // Если указана категория сделки, устанавливаем её
        if (form.bitrixDealCategory) {
            dealData['CATEGORY_ID'] = form.bitrixDealCategory;
            submission.bitrixCategoryId = form.bitrixDealCategory;
        }
        try {
            // Создаем сделку в Битрикс24
            const dealResponse = yield bitrix24Service_1.default.createDeal(dealData);
            // Обновляем заявку информацией о созданной сделке
            submission.bitrixDealId = dealResponse.result.toString();
            submission.bitrixSyncStatus = 'synced';
            yield submission.save();
            // Добавляем запись в историю
            yield new SubmissionHistory_1.default({
                submissionId: submission._id,
                action: 'created',
                changeType: 'data_update',
                description: 'Заявка создана и синхронизирована с Битрикс24',
                newValue: { bitrixDealId: dealResponse.result },
                changedBy: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id) || null,
            }).save();
        }
        catch (bitrixError) {
            console.error('Ошибка синхронизации с Битрикс24:', bitrixError);
            // Обновляем статус синхронизации
            submission.bitrixSyncStatus = 'failed';
            submission.bitrixSyncError = bitrixError.message;
            yield submission.save();
            // Добавляем запись в историю об ошибке
            yield new SubmissionHistory_1.default({
                submissionId: submission._id,
                action: 'sync_failed',
                changeType: 'data_update',
                description: 'Ошибка синхронизации с Битрикс24',
                newValue: { error: bitrixError.message },
                changedBy: ((_d = req.user) === null || _d === void 0 ? void 0 : _d.id) || null,
            }).save();
        }
        // Возвращаем успешный ответ
        res.status(200).json({
            success: true,
            message: form.successMessage || 'Спасибо! Ваша заявка успешно отправлена.',
            submissionId: submission._id,
            submissionNumber: submission.submissionNumber,
            dealId: submission.bitrixDealId,
        });
    }
    catch (error) {
        console.error('Ошибка при отправке формы:', error);
        res
            .status(500)
            .json({
            message: 'Произошла ошибка при обработке заявки',
            error: error.message,
        });
    }
});
exports.submitForm = submitForm;
// Получение всех заявок (для админов)
const getAllSubmissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 20, status, priority, assignedTo, userId, dateFrom, dateTo, search, tags, } = req.query;
        // Строим фильтр
        const filter = {};
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        if (assignedTo)
            filter.assignedTo = assignedTo;
        if (userId)
            filter.userId = userId;
        if (tags && Array.isArray(tags))
            filter.tags = { $in: tags };
        // Фильтр по дате
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom)
                filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo)
                filter.createdAt.$lte = new Date(dateTo);
        }
        // Поиск по номеру заявки или данным формы
        if (search) {
            filter.$or = [
                { submissionNumber: { $regex: search, $options: 'i' } },
                { 'formData.company': { $regex: search, $options: 'i' } },
                { 'formData.contact_name': { $regex: search, $options: 'i' } },
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const submissions = yield Submission_1.default.find(filter)
            .populate('formId', 'name title')
            .populate('userId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = yield Submission_1.default.countDocuments(filter);
        res.json({
            success: true,
            data: submissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Ошибка получения заявок:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявок',
        });
    }
});
exports.getAllSubmissions = getAllSubmissions;
// Получение заявок текущего пользователя
const getMySubmissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Пользователь не авторизован',
            });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const submissions = yield Submission_1.default.find({ userId })
            .populate('formId', 'name title')
            .populate('assignedTo', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = yield Submission_1.default.countDocuments({ userId });
        res.json({
            success: true,
            data: submissions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Ошибка получения заявок пользователя:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявок',
        });
    }
});
exports.getMySubmissions = getMySubmissions;
// Получение заявки по ID
const getSubmissionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const isAdmin = req.isAdmin;
        const submission = yield Submission_1.default.findById(id)
            .populate('formId', 'name title')
            .populate('userId', 'firstName lastName email')
            .populate('assignedTo', 'firstName lastName email');
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Проверяем права доступа
        if (!isAdmin && ((_b = submission.userId) === null || _b === void 0 ? void 0 : _b.toString()) !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Нет прав для просмотра этой заявки',
            });
        }
        // Получаем историю изменений
        const history = yield SubmissionHistory_1.default.find({ submissionId: id })
            .populate('changedBy', 'firstName lastName email')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: {
                submission,
                history,
            },
        });
    }
    catch (error) {
        console.error('Ошибка получения заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения заявки',
        });
    }
});
exports.getSubmissionById = getSubmissionById;
// Обновление статуса заявки
const updateSubmissionStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { status, comment } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const submission = yield Submission_1.default.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        const oldStatus = submission.status;
        submission.status = status;
        yield submission.save();
        // Добавляем запись в историю
        yield new SubmissionHistory_1.default({
            submissionId: id,
            action: 'status_changed',
            changeType: 'status_change',
            description: `Статус изменен с "${oldStatus}" на "${status}"`,
            oldValue: oldStatus,
            newValue: status,
            comment,
            changedBy: userId,
        }).save();
        // Синхронизируем с Битрикс24 если есть dealId
        if (submission.bitrixDealId) {
            try {
                yield bitrix24Service_1.default.updateDealStatus(submission.bitrixDealId, status, submission.bitrixCategoryId);
                submission.bitrixSyncStatus = 'synced';
                yield submission.save();
            }
            catch (bitrixError) {
                console.error('Ошибка синхронизации статуса с Битрикс24:', bitrixError);
                submission.bitrixSyncStatus = 'failed';
                submission.bitrixSyncError = bitrixError.message;
                yield submission.save();
            }
        }
        res.json({
            success: true,
            message: 'Статус заявки обновлен',
        });
    }
    catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления статуса',
        });
    }
});
exports.updateSubmissionStatus = updateSubmissionStatus;
// Обновление заявки
const updateSubmission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const submission = yield Submission_1.default.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        // Проверяем права доступа
        const isAdmin = req.isAdmin;
        if (!isAdmin && ((_b = submission.userId) === null || _b === void 0 ? void 0 : _b.toString()) !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Нет прав для редактирования этой заявки',
            });
        }
        const oldData = Object.assign({}, submission.toObject());
        // Обновляем поля
        Object.assign(submission, updateData);
        yield submission.save();
        // Добавляем запись в историю
        yield new SubmissionHistory_1.default({
            submissionId: id,
            action: 'updated',
            changeType: 'data_update',
            description: 'Заявка обновлена',
            oldValue: oldData,
            newValue: updateData,
            changedBy: userId,
        }).save();
        res.json({
            success: true,
            data: submission,
            message: 'Заявка обновлена',
        });
    }
    catch (error) {
        console.error('Ошибка обновления заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка обновления заявки',
        });
    }
});
exports.updateSubmission = updateSubmission;
// Удаление заявки
const deleteSubmission = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const submission = yield Submission_1.default.findById(id);
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Заявка не найдена',
            });
        }
        yield Submission_1.default.findByIdAndDelete(id);
        yield SubmissionHistory_1.default.deleteMany({ submissionId: id });
        res.json({
            success: true,
            message: 'Заявка удалена',
        });
    }
    catch (error) {
        console.error('Ошибка удаления заявки:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка удаления заявки',
        });
    }
});
exports.deleteSubmission = deleteSubmission;
// Получение статусов из Битрикс24
const getBitrixStages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoryId } = req.params;
        const stages = yield bitrix24Service_1.default.getDealStages(categoryId);
        res.json({
            success: true,
            data: stages,
        });
    }
    catch (error) {
        console.error('Ошибка получения статусов из Битрикс24:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка получения статусов',
        });
    }
});
exports.getBitrixStages = getBitrixStages;
